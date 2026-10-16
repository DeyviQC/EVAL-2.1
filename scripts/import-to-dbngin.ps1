param(
    [string]$TargetDatabase = "eval_dev",
    [int]$Port = 3306
)

$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$mysql = Join-Path $repo ".local\runtime\mysql\bin\mysql.exe"
$backupsDir = Join-Path $repo "backups"

$latestBackup = Get-ChildItem -LiteralPath $backupsDir -Filter "eval-backup-*.zip" | Sort-Object CreationTime -Descending | Select-Object -First 1
if (!$latestBackup) {
    throw "No backup archive found in $backupsDir."
}

Write-Host "Importing backup $($latestBackup.Name) into DBngin MySQL on port $Port..." -ForegroundColor Cyan

# 1. Create database
$createSql = "CREATE DATABASE IF NOT EXISTS $TargetDatabase CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;"
& $mysql --host=127.0.0.1 --port=$Port --user=root -e $createSql
if ($LASTEXITCODE -ne 0) { throw "Failed to create database on port $Port" }

# 2. Extract SQL dump to temp
$tempDir = Join-Path ([IO.Path]::GetTempPath()) "dbngin-import-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($latestBackup.FullName, $tempDir)
    $sqlDump = Join-Path $tempDir "eval_database.sql"
    if (!(Test-Path -LiteralPath $sqlDump)) {
        throw "eval_database.sql not found in backup archive."
    }

    Write-Host "Restoring tables and records into $TargetDatabase..." -ForegroundColor Cyan
    $importArgs = @("--host=127.0.0.1", "--port=$Port", "--user=root", "--default-character-set=utf8mb4", $TargetDatabase)
    $proc = Start-Process -FilePath $mysql -ArgumentList $importArgs -RedirectStandardInput $sqlDump -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -ne 0) { throw "Import failed with code $($proc.ExitCode)" }

    # 3. Verify table count
    $verifySql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$TargetDatabase';"
    $tables = (& $mysql --host=127.0.0.1 --port=$Port --user=root -s -N -e $verifySql).Trim()

    Write-Host "SUCCESS! Database '$TargetDatabase' restored into DBngin on port $Port." -ForegroundColor Green
    Write-Host "Total tables imported: $tables" -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $tempDir) {
        Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
