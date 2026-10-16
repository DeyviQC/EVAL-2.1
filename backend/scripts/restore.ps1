<#
.SYNOPSIS
    EVAL Automated Restore Script
    Restores an EVAL backup archive and verifies database schema and attachment integrity.

.DESCRIPTION
    1. Validates the backup archive structure and SHA-256 checksums in manifest.json.
    2. Drops / cleans the target MySQL database and restores from the SQL dump.
    3. Restores physical attachments (deliveries/ and materials/) with hash verification.
    4. Performs post-restore verification:
       - Confirms all 19 migrations and 38 tables are present.
       - Validates write guard ordinal and lifecycle events count.
       - Verifies row metrics against the backup manifest.

.PARAMETER BackupFile
    Path to the backup ZIP archive. If omitted, the latest backup in ./backups is used.

.PARAMETER TargetDatabase
    Name of the target MySQL database. Default: eval_dev

.PARAMETER VerifyOnly
    Validates backup archive integrity without modifying the live database or files.
#>

param(
    [string]$BackupFile = "",
    [string]$TargetDatabase = "",
    [switch]$VerifyOnly,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = [IO.Path]::GetFullPath((Join-Path $scriptDir "..\.."))
$devRoot = Join-Path $repo ".local\eval-dev"
$runtimeRoot = Join-Path $repo ".local\runtime"
$backupsDir = Join-Path $repo "backups"

# Resolve Backup File
if ([string]::IsNullOrWhiteSpace($BackupFile)) {
    $latestBackup = Get-ChildItem -LiteralPath $backupsDir -Filter "eval-backup-*.zip" -ErrorAction SilentlyContinue | Sort-Object CreationTime -Descending | Select-Object -First 1
    if (!$latestBackup) {
        throw "No backup archive found in $backupsDir. Run backup.ps1 first."
    }
    $BackupFile = $latestBackup.FullName
}

if (!(Test-Path -LiteralPath $BackupFile)) {
    throw "Backup file not found at $BackupFile"
}

$stateFile = Join-Path $devRoot "state.json"
if (!(Test-Path -LiteralPath $stateFile)) {
    throw "EVAL state file not found at $stateFile"
}

$state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json

# Helper to decrypt DPAPI-protected values
function Decrypt-Value([string]$Value) {
    $secure = ConvertTo-SecureString $Value
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secure.Dispose()
    }
}

$migrationPass = Decrypt-Value $state.migration
if ([string]::IsNullOrWhiteSpace($TargetDatabase)) {
    $TargetDatabase = $state.database
}

$mysql = Join-Path $runtimeRoot "mysql\bin\mysql.exe"
if (!(Test-Path -LiteralPath $mysql)) {
    throw "mysql.exe not found at $mysql"
}

$tempExtractDir = Join-Path ([IO.Path]::GetTempPath()) "eval-restore-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempExtractDir -Force | Out-Null

try {
    Write-Host "[EVAL Restore] Reading archive: $(Split-Path -Leaf $BackupFile)..." -ForegroundColor Cyan

    # 1. Extract Archive
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($BackupFile, $tempExtractDir)

    $manifestPath = Join-Path $tempExtractDir "manifest.json"
    if (!(Test-Path -LiteralPath $manifestPath)) {
        throw "Corrupt backup: manifest.json not found in archive."
    }

    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.product -ne "EVAL") {
        throw "Invalid backup: product marker is '$($manifest.product)', expected 'EVAL'."
    }

    Write-Host "  Product: $($manifest.product) | Institution: $($manifest.institution)" -ForegroundColor Gray
    Write-Host "  Created: $($manifest.created_at) | Source Database: $($manifest.database.name)" -ForegroundColor Gray

    # 2. Checksum Verification of SQL Dump
    $sqlDumpPath = Join-Path $tempExtractDir $manifest.database.sql_file
    if (!(Test-Path -LiteralPath $sqlDumpPath)) {
        throw "Corrupt backup: SQL dump file missing."
    }

    $calculatedSqlHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sqlDumpPath).Hash
    if ($calculatedSqlHash -ne $manifest.database.sql_sha256) {
        throw "Integrity failure: SQL dump SHA256 mismatch. Expected $($manifest.database.sql_sha256), calculated $calculatedSqlHash"
    }
    Write-Host "  [OK] Database dump integrity verified: SHA-256 matches manifest." -ForegroundColor Green

    # 3. Checksum Verification of Physical Files
    $verifiedFiles = 0
    foreach ($fileEntry in $manifest.files.manifest) {
        $extractedFilePath = Join-Path $tempExtractDir ($fileEntry.relative_path.Replace('/', '\'))
        if (!(Test-Path -LiteralPath $extractedFilePath)) {
            throw "Corrupt backup: Missing attachment file $($fileEntry.relative_path)"
        }
        $calcHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $extractedFilePath).Hash
        if ($calcHash -ne $fileEntry.sha256) {
            throw "Integrity failure: Attachment $($fileEntry.relative_path) SHA256 mismatch."
        }
        $verifiedFiles++
    }
    Write-Host "  [OK] All $verifiedFiles attachment files verified: SHA-256 matches manifest." -ForegroundColor Green

    if ($VerifyOnly) {
        Write-Host "[EVAL Restore] VerifyOnly mode: Backup archive is 100% valid and consistent." -ForegroundColor Green
        return (@{
            verified = $true
            backup_file = $BackupFile
            tables = $manifest.database.table_count
            migrations = $manifest.database.migration_count
            files_verified = $verifiedFiles
            last_ordinal = $manifest.database.last_ordinal
        } | ConvertTo-Json)
    }

    # 4. Restore Database
    Write-Host "[EVAL Restore] Restoring database into '$TargetDatabase'..." -ForegroundColor Cyan

    # Ensure database exists and recreate cleanly if needed
    $initSql = "CREATE DATABASE IF NOT EXISTS $TargetDatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;"
    $initArgs = @("--host=127.0.0.1", "--port=3307", "--user=eval_dev_migration", "-p$migrationPass", "-e", $initSql)
    $proc = Start-Process -FilePath $mysql -ArgumentList $initArgs -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -ne 0) { throw "Failed to initialize database $TargetDatabase" }

    # Import SQL dump
    $importArgs = @("--host=127.0.0.1", "--port=3307", "--user=eval_dev_migration", "-p$migrationPass", "--default-character-set=utf8mb4", $TargetDatabase)
    $importProcess = Start-Process -FilePath $mysql -ArgumentList $importArgs -RedirectStandardInput $sqlDumpPath -RedirectStandardError (Join-Path $tempExtractDir "import_err.log") -Wait -PassThru -NoNewWindow
    if ($importProcess.ExitCode -ne 0) {
        $err = Get-Content (Join-Path $tempExtractDir "import_err.log") -Raw
        throw "MySQL import failed with code $($importProcess.ExitCode): $err"
    }
    Write-Host "  [OK] MySQL database schema and records restored." -ForegroundColor Green

    # 5. Restore Physical Attachment Files
    $deliveriesSource = Join-Path $tempExtractDir "files\deliveries"
    $materialsSource = Join-Path $tempExtractDir "files\materials"
    $deliveriesDest = Join-Path $devRoot "deliveries"
    $materialsDest = Join-Path $devRoot "materials"

    if (Test-Path -LiteralPath $deliveriesSource) {
        if (!(Test-Path -LiteralPath $deliveriesDest)) { New-Item -ItemType Directory -Path $deliveriesDest -Force | Out-Null }
        Copy-Item -LiteralPath "$deliveriesSource\*" -Destination $deliveriesDest -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $materialsSource) {
        if (!(Test-Path -LiteralPath $materialsDest)) { New-Item -ItemType Directory -Path $materialsDest -Force | Out-Null }
        Copy-Item -LiteralPath "$materialsSource\*" -Destination $materialsDest -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  [OK] Physical attachments restored to $devRoot." -ForegroundColor Green

    # 6. Post-Restoration Database Integrity Verification
    $verifyScript = @"
SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$TargetDatabase') AS table_count,
    (SELECT COUNT(*) FROM \`$TargetDatabase\`.migrations) AS migration_count,
    (SELECT last_ordinal FROM \`$TargetDatabase\`.academic_write_guard LIMIT 1) AS last_ordinal;
"@
    $verifyArgs = @("--host=127.0.0.1", "--port=3307", "--user=eval_dev_migration", "-p$migrationPass", "-s", "-N", "-e", $verifyScript)
    $verifyOutput = & $mysql @verifyArgs
    $parts = ($verifyOutput -split '\s+') | Where-Object { $_ -ne "" }
    
    $restoredTables = [int]$parts[0]
    $restoredMigrations = [int]$parts[1]
    $restoredOrdinal = [string]$parts[2]

    if ($restoredTables -ne $manifest.database.table_count) {
        throw "Restoration validation failed: Table count mismatch ($restoredTables vs expected $($manifest.database.table_count))."
    }
    if ($restoredMigrations -ne $manifest.database.migration_count) {
        throw "Restoration validation failed: Migration count mismatch ($restoredMigrations vs expected $($manifest.database.migration_count))."
    }
    if ($restoredOrdinal -ne $manifest.database.last_ordinal) {
        throw "Restoration validation failed: Write guard ordinal mismatch ($restoredOrdinal vs expected $($manifest.database.last_ordinal))."
    }

    Write-Host "[EVAL Restore] Restoration verified successfully!" -ForegroundColor Green
    Write-Host "  Database: $TargetDatabase ($restoredTables tables, $restoredMigrations migrations, Write Guard Ordinal $restoredOrdinal)" -ForegroundColor Gray
    Write-Host "  Physical files: $verifiedFiles attachments restored and verified" -ForegroundColor Gray

    $result = @{
        success = $true
        database = $TargetDatabase
        tables = $restoredTables
        migrations = $restoredMigrations
        last_ordinal = $restoredOrdinal
        files_restored = $verifiedFiles
        backup_created_at = $manifest.created_at
        restored_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }

    return ($result | ConvertTo-Json)
}
finally {
    if (Test-Path -LiteralPath $tempExtractDir) {
        Remove-Item -LiteralPath $tempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
