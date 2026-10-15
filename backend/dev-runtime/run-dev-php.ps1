param (
    [Parameter(Mandatory=$true)]
    [string]$ScriptPath
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/../scripts/manage-dev.ps1"

$dbEnv = Db-Environment 'runtime'
foreach ($key in $dbEnv.Keys) {
    [System.Environment]::SetEnvironmentVariable($key, $dbEnv[$key], [System.EnvironmentVariableTarget]::Process)
}
$migEnv = Db-Environment 'migration'
[System.Environment]::SetEnvironmentVariable('EVAL_MIGRATION_USER', $migEnv['EVAL_DB_USER'], [System.EnvironmentVariableTarget]::Process)
[System.Environment]::SetEnvironmentVariable('EVAL_MIGRATION_PASSWORD', $migEnv['EVAL_DB_PASSWORD'], [System.EnvironmentVariableTarget]::Process)
[System.Environment]::SetEnvironmentVariable('EVAL_RUNTIME_PASSWORD', $dbEnv['EVAL_DB_PASSWORD'], [System.EnvironmentVariableTarget]::Process)

$php = Join-Path $ownedRoot 'php\php.exe'
$ini = Join-Path $ownedRoot 'php.ini'

& $php -c $ini -d display_errors=1 $ScriptPath
