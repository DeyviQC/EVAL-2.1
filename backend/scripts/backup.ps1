<#
.SYNOPSIS
    EVAL Automated Backup Script
    Generates an atomic, verified backup archive of the EVAL database and physical files.

.DESCRIPTION
    1. Dumps the MySQL database schema and data using mysqldump (single-transaction, UTF-8, routines, triggers).
    2. Packages physical educational attachments (deliveries/ and materials/).
    3. Calculates cryptographic SHA-256 checksums for all files in a manifest.json.
    4. Records write guard ordinals, table counts, and migration checkpoints.
    5. Packages into a compressed timestamped ZIP archive.
    6. Enforces backup retention policy.

.PARAMETER BackupDir
    Destination directory for backup archives. Default: ./backups

.PARAMETER RetentionCount
    Number of recent backup archives to retain. Default: 7
#>

param(
    [string]$BackupDir = "",
    [int]$RetentionCount = 7
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = [IO.Path]::GetFullPath((Join-Path $scriptDir "..\.."))
$devRoot = Join-Path $repo ".local\eval-dev"
$runtimeRoot = Join-Path $repo ".local\runtime"

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
    $BackupDir = Join-Path $repo "backups"
}
if (!(Test-Path -LiteralPath $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
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
$dbName = $state.database
$mysqldump = Join-Path $runtimeRoot "mysql\bin\mysqldump.exe"
$mysql = Join-Path $runtimeRoot "mysql\bin\mysql.exe"
$php = Join-Path $runtimeRoot "php\php.exe"
$ini = Join-Path $runtimeRoot "php.ini"

if (!(Test-Path -LiteralPath $mysqldump)) {
    throw "mysqldump.exe not found at $mysqldump"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$tempBackupName = "eval-backup-$timestamp"
$tempDir = Join-Path ([IO.Path]::GetTempPath()) "eval-backup-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    Write-Host "[EVAL Backup] Starting backup process: $tempBackupName..." -ForegroundColor Cyan

    # 1. Dump MySQL Database
    $sqlDumpPath = Join-Path $tempDir "eval_database.sql"
    $dumpArgs = @(
        "--host=127.0.0.1",
        "--port=3307",
        "--user=eval_dev_migration",
        "-p$migrationPass",
        "--default-character-set=utf8mb4",
        "--single-transaction",
        "--quick",
        "--routines",
        "--triggers",
        "--hex-blob",
        $dbName
    )

    $dumpProcess = Start-Process -FilePath $mysqldump -ArgumentList $dumpArgs -RedirectStandardOutput $sqlDumpPath -RedirectStandardError (Join-Path $tempDir "dump_error.log") -Wait -PassThru -NoNewWindow
    if ($dumpProcess.ExitCode -ne 0) {
        $err = Get-Content (Join-Path $tempDir "dump_error.log") -Raw
        throw "mysqldump failed with exit code $($dumpProcess.ExitCode): $err"
    }

    $sqlHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sqlDumpPath).Hash
    $sqlSize = (Get-Item -LiteralPath $sqlDumpPath).Length

    # 2. Collect Physical Attachment Files
    $deliveriesSource = Join-Path $devRoot "deliveries"
    $materialsSource = Join-Path $devRoot "materials"
    $deliveriesDest = Join-Path $tempDir "files\deliveries"
    $materialsDest = Join-Path $tempDir "files\materials"

    New-Item -ItemType Directory -Path $deliveriesDest -Force | Out-Null
    New-Item -ItemType Directory -Path $materialsDest -Force | Out-Null

    $fileManifest = @()

    if (Test-Path -LiteralPath $deliveriesSource) {
        Get-ChildItem -LiteralPath $deliveriesSource -File -Recurse | ForEach-Object {
            $rel = $_.FullName.Substring($deliveriesSource.Length).TrimStart('\', '/')
            $destFile = Join-Path $deliveriesDest $rel
            $destSub = Split-Path -Parent $destFile
            if (!(Test-Path -LiteralPath $destSub)) { New-Item -ItemType Directory -Path $destSub -Force | Out-Null }
            Copy-Item -LiteralPath $_.FullName -Destination $destFile -Force
            $fileHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
            $fileManifest += @{
                category = "delivery"
                relative_path = "files/deliveries/$rel"
                size = $_.Length
                sha256 = $fileHash
            }
        }
    }

    if (Test-Path -LiteralPath $materialsSource) {
        Get-ChildItem -LiteralPath $materialsSource -File -Recurse | ForEach-Object {
            $rel = $_.FullName.Substring($materialsSource.Length).TrimStart('\', '/')
            $destFile = Join-Path $materialsDest $rel
            $destSub = Split-Path -Parent $destFile
            if (!(Test-Path -LiteralPath $destSub)) { New-Item -ItemType Directory -Path $destSub -Force | Out-Null }
            Copy-Item -LiteralPath $_.FullName -Destination $destFile -Force
            $fileHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
            $fileManifest += @{
                category = "material"
                relative_path = "files/materials/$rel"
                size = $_.Length
                sha256 = $fileHash
            }
        }
    }

    # 3. Query Database State for Manifest
    $manageDev = Join-Path $repo "backend\scripts\manage-dev.ps1"
    $snapshotRaw = & powershell -ExecutionPolicy Bypass -File $manageDev snapshot
    $dbState = $snapshotRaw | ConvertFrom-Json

    # 4. Generate manifest.json
    $manifest = @{
        product = "EVAL"
        version = "2.1"
        institution = "I.E. Nuestra Señora de las Mercedes"
        backup_id = $tempBackupName
        created_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        database = @{
            name = $dbName
            sql_file = "eval_database.sql"
            sql_sha256 = $sqlHash
            sql_size_bytes = $sqlSize
            table_count = $dbState.tables
            migration_count = $dbState.migrations
            last_ordinal = $dbState.ordinal
            table_metrics = @{
                accounts = $dbState.accounts
                periods = $dbState.periods
                assignments = $dbState.assignments
                enrollments = $dbState.enrollments
                materials = $dbState.materials
            }
        }
        files = @{
            total_count = $fileManifest.Count
            manifest = $fileManifest
        }
    }

    $manifestPath = Join-Path $tempDir "manifest.json"
    [IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 8))

    # Remove temporary files before compression
    Remove-Item -LiteralPath (Join-Path $tempDir "dump_error.log") -Force -ErrorAction SilentlyContinue

    # 5. Compress to ZIP archive
    $zipPath = Join-Path $BackupDir "$tempBackupName.zip"
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

    $finalSize = (Get-Item -LiteralPath $zipPath).Length
    $finalHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash

    Write-Host "[EVAL Backup] Backup created successfully: $zipPath" -ForegroundColor Green
    Write-Host "  Database: $dbName ($($dbState.tables) tables, $($dbState.migrations) migrations, Ordinal $($dbState.ordinal))" -ForegroundColor Gray
    Write-Host "  Physical files: $($fileManifest.Count) attachments packaged" -ForegroundColor Gray
    Write-Host "  Archive size: $([Math]::Round($finalSize / 1MB, 2)) MB | SHA256: $($finalHash.Substring(0, 16))..." -ForegroundColor Gray

    # 6. Apply Retention Policy
    $existingBackups = Get-ChildItem -LiteralPath $BackupDir -Filter "eval-backup-*.zip" | Sort-Object CreationTime -Descending
    if ($existingBackups.Count -gt $RetentionCount) {
        $toRemove = $existingBackups | Select-Object -Skip $RetentionCount
        foreach ($old in $toRemove) {
            Write-Host "[EVAL Backup] Retaining newest $RetentionCount backups. Purging old backup: $($old.Name)" -ForegroundColor DarkYellow
            Remove-Item -LiteralPath $old.FullName -Force
        }
    }

    $result = @{
        success = $true
        backup_file = $zipPath
        archive_name = "$tempBackupName.zip"
        size_bytes = $finalSize
        sha256 = $finalHash
        table_count = $dbState.tables
        migration_count = $dbState.migrations
        last_ordinal = $dbState.ordinal
        files_count = $fileManifest.Count
        created_at = $manifest.created_at
    }

    return ($result | ConvertTo-Json)
}
finally {
    if (Test-Path -LiteralPath $tempDir) {
        Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
