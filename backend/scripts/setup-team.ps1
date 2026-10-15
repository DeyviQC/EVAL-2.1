param([string]$Command = 'inspect')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
if ($Command -notin @('inspect', 'prepare', 'verify')) {
    [Console]::Error.WriteLine('Unsupported setup command. Use inspect, prepare, or verify.')
    exit 2
}

$repo = [IO.Path]::GetFullPath((Split-Path (Split-Path $PSScriptRoot)))
$localRoot = Join-Path $repo '.local'
$runtimeRoot = Join-Path $localRoot 'runtime'
$downloadRoot = Join-Path $localRoot 'downloads'
$artifacts = [ordered]@{
    php = [ordered]@{
        version = '8.4.26'
        archive = 'php-8.4.26-nts-Win32-vs17-x64.zip'
        url = 'https://downloads.php.net/~windows/releases/php-8.4.26-nts-Win32-vs17-x64.zip'
        sha256 = 'da68394f9193b7f6b89d0c76861a4034ae10efee7fd55a7255d8118c2acf70d7'
    }
    mysql = [ordered]@{
        version = '8.4.11'
        archive = 'mysql-8.4.11-winx64.zip'
        url = 'https://cdn.mysql.com/Downloads/MySQL-8.4/mysql-8.4.11-winx64.zip'
        sha256 = 'a492371d687d2bab088b0062581144a0044b8964baefdf4faa579292b423d25c'
    }
    composer = [ordered]@{
        version = '2.10.3'
        archive = 'composer-2.10.3.phar'
        url = 'https://getcomposer.org/download/2.10.3/composer.phar'
        sha256 = '7a2d379d5b8ffdaa028580ef26494c36d2feef4b178d3dd1473a4dbc5e17c8d6'
    }
}

function Get-Contract {
    return [ordered]@{
        runtime = '.local/runtime'
        php = [ordered]@{ version = $artifacts.php.version; archive = $artifacts.php.archive; sha256 = $artifacts.php.sha256 }
        mysql = [ordered]@{ version = $artifacts.mysql.version; archive = $artifacts.mysql.archive; sha256 = $artifacts.mysql.sha256; port = 3307 }
        composer = [ordered]@{ version = $artifacts.composer.version; archive = $artifacts.composer.archive; sha256 = $artifacts.composer.sha256 }
        generatedPathsAreIgnored = $true
        requiresAdministrator = $false
    }
}

function Protect-Directory([string]$Path) {
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = Get-Acl -LiteralPath $Path
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($rule in @($acl.GetAccessRules($true, $false, [Security.Principal.SecurityIdentifier]))) {
        $acl.RemoveAccessRuleSpecific($rule)
    }
    foreach ($id in @($sid.Value, 'S-1-5-18', 'S-1-5-32-544')) {
        $principal = New-Object Security.Principal.SecurityIdentifier($id)
        $rule = New-Object Security.AccessControl.FileSystemAccessRule($principal, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $acl.AddAccessRule($rule)
    }
    [IO.Directory]::SetAccessControl($Path, $acl)
}

function Protect-File([string]$Path) {
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = Get-Acl -LiteralPath $Path
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($rule in @($acl.GetAccessRules($true, $false, [Security.Principal.SecurityIdentifier]))) {
        $acl.RemoveAccessRuleSpecific($rule)
    }
    foreach ($id in @($sid.Value, 'S-1-5-18', 'S-1-5-32-544')) {
        $principal = New-Object Security.Principal.SecurityIdentifier($id)
        $rule = New-Object Security.AccessControl.FileSystemAccessRule($principal, 'FullControl', 'None', 'None', 'Allow')
        $acl.AddAccessRule($rule)
    }
    [IO.File]::SetAccessControl($Path, $acl)
}

function Assert-Prerequisites {
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or !$env:PROCESSOR_ARCHITECTURE.Contains('64')) {
        throw 'EVAL team setup requires 64-bit Windows.'
    }
    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (!$git) { throw 'Git is required in PATH.' }
    if (!$node -or !$npm) { throw 'Node.js 24 or newer and npm are required in PATH.' }
    $nodeVersion = (& $node.Source --version).TrimStart('v').Split('.')[0]
    if ([int]$nodeVersion -lt 24) { throw 'Node.js 24 or newer is required.' }
    & git -C $repo check-ignore -q -- '.local/runtime/probe'
    if ($LASTEXITCODE -ne 0) { throw '.local/runtime must remain ignored by Git.' }
}

function Get-Artifact($artifact) {
    $target = Join-Path $downloadRoot $artifact.archive
    if (!(Test-Path -LiteralPath $target)) {
        Write-Output ('Downloading ' + $artifact.archive + '...')
        $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
        if ($curl) {
            & $curl.Source -fL --retry 2 -o $target $artifact.url
            if ($LASTEXITCODE -ne 0) { throw ('Download failed: ' + $artifact.archive) }
        } else {
            Invoke-WebRequest -UseBasicParsing -Uri $artifact.url -OutFile $target
        }
    }
    $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $artifact.sha256) {
        Remove-Item -LiteralPath $target -Force
        throw ('Integrity check failed; the invalid download was removed: ' + $artifact.archive)
    }
    return $target
}

function Wait-ForMySql([int]$ExpectedPid = 0) {
    $deadline = [DateTime]::UtcNow.AddSeconds(25)
    do {
        Start-Sleep -Milliseconds 250
        $listener = @(Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue)
    } while ($listener.Count -eq 0 -and [DateTime]::UtcNow -lt $deadline)
    if ($listener.Count -ne 1 -or $listener[0].LocalAddress -ne '127.0.0.1') { throw 'Owned MySQL did not bind exclusively to 127.0.0.1:3307.' }
    if ($ExpectedPid -and $listener[0].OwningProcess -ne $ExpectedPid) {
        $candidate = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $listener[0].OwningProcess)
        if ($candidate.ParentProcessId -ne $ExpectedPid) { throw 'Unexpected process owns MySQL port 3307.' }
    }
    return Get-Process -Id $listener[0].OwningProcess
}

function Write-DatabaseState($Server, $Launcher) {
    $state = [ordered]@{
        executable = [IO.Path]::GetFullPath((Join-Path $runtimeRoot 'mysql\bin\mysqld.exe'))
        port = 3307
        pid = $Server.Id
        started = $Server.StartTime.ToUniversalTime().Ticks
    }
    if ($Launcher -and $Launcher.Id -ne $Server.Id) {
        $state.launcher_pid = $Launcher.Id
        $state.launcher_started = $Launcher.StartTime.ToUniversalTime().Ticks
    }
    $statePath = Join-Path $runtimeRoot 'database-state.json'
    [IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
    Protect-File $statePath
}

function Test-Runtime {
    $required = @(
        (Join-Path $runtimeRoot 'php\php.exe'),
        (Join-Path $runtimeRoot 'php.ini'),
        (Join-Path $runtimeRoot 'composer.ini'),
        (Join-Path $runtimeRoot 'composer.phar'),
        (Join-Path $runtimeRoot 'mysql\bin\mysqld.exe'),
        (Join-Path $runtimeRoot 'mysql\data'),
        (Join-Path $runtimeRoot 'tls\ca.pem'),
        (Join-Path $runtimeRoot 'database-state.json'),
        (Join-Path $runtimeRoot 'vendor\autoload.php'),
        (Join-Path $repo 'frontend\node_modules'),
        (Join-Path $repo 'frontend\dist\index.html')
    )
    foreach ($path in $required) { if (!(Test-Path -LiteralPath $path)) { throw ('Missing prepared path: ' + $path) } }
    $phpVersion = & (Join-Path $runtimeRoot 'php\php.exe') -c (Join-Path $runtimeRoot 'php.ini') -r 'echo PHP_VERSION;'
    if (!$phpVersion.StartsWith($artifacts.php.version)) { throw 'Prepared PHP version does not match the pinned contract.' }
    $state = Get-Content -LiteralPath (Join-Path $runtimeRoot 'database-state.json') -Raw | ConvertFrom-Json
    if ($state.port -ne 3307 -or [IO.Path]::GetFullPath($state.executable) -ne [IO.Path]::GetFullPath((Join-Path $runtimeRoot 'mysql\bin\mysqld.exe'))) {
        throw 'Prepared MySQL state does not match the owned runtime.'
    }
    $listener = @(Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue)
    if ($listener.Count -ne 1 -or $listener[0].LocalAddress -ne '127.0.0.1' -or $listener[0].OwningProcess -ne $state.pid) {
        throw 'Prepared files are valid, but owned MySQL is not running. Run manage-dev.ps1 -Command start.'
    }
    Write-Output 'EVAL team runtime is ready and owned MySQL is running.'
}

if ($Command -eq 'inspect') {
    Get-Contract | ConvertTo-Json -Depth 4
    exit 0
}

Assert-Prerequisites
if ($Command -eq 'verify') {
    Test-Runtime
    exit 0
}

if (Test-Path -LiteralPath $runtimeRoot) {
    throw 'Existing .local/runtime was retained. Run -Command verify or move it manually after reviewing its contents.'
}
if (Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 3307 is already occupied; no existing database process was changed.'
}

[void](New-Item -ItemType Directory -Force -Path $localRoot)
Protect-Directory $localRoot
[void](New-Item -ItemType Directory -Force -Path $downloadRoot)
$stage = Join-Path $localRoot ('setup-' + [Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $stage)
$createdRuntime = $false
$launcher = $null
$server = $null
try {
    $phpArchive = Get-Artifact $artifacts.php
    $mysqlArchive = Get-Artifact $artifacts.mysql
    $composerArchive = Get-Artifact $artifacts.composer

    $stageRuntime = Join-Path $stage 'runtime'
    $stagePhp = Join-Path $stageRuntime 'php'
    [void](New-Item -ItemType Directory -Path $stagePhp -Force)
    Expand-Archive -LiteralPath $phpArchive -DestinationPath $stagePhp
    Expand-Archive -LiteralPath $mysqlArchive -DestinationPath (Join-Path $stage 'mysql-extract')
    $mysqlSource = Get-ChildItem -LiteralPath (Join-Path $stage 'mysql-extract') -Directory | Select-Object -First 1
    if (!$mysqlSource) { throw 'MySQL archive layout is invalid.' }
    Move-Item -LiteralPath $mysqlSource.FullName -Destination (Join-Path $stageRuntime 'mysql')
    Copy-Item -LiteralPath $composerArchive -Destination (Join-Path $stageRuntime 'composer.phar')

    $mysql = Join-Path $stageRuntime 'mysql\bin\mysqld.exe'
    $data = Join-Path $stageRuntime 'mysql\data'
    & $mysql --no-defaults --initialize-insecure ('--basedir=' + (Join-Path $stageRuntime 'mysql')) ('--datadir=' + $data)
    if ($LASTEXITCODE -ne 0) { throw 'MySQL data initialization failed.' }
    $tls = Join-Path $stageRuntime 'tls'
    [void](New-Item -ItemType Directory -Path $tls)
    foreach ($name in @('ca.pem', 'server-cert.pem', 'server-key.pem')) {
        Copy-Item -LiteralPath (Join-Path $data $name) -Destination (Join-Path $tls $name)
    }

    Move-Item -LiteralPath $stageRuntime -Destination $runtimeRoot
    $createdRuntime = $true
    Protect-Directory $runtimeRoot
    $extensionDirectory = (Join-Path $runtimeRoot 'php\ext').Replace('\', '/')
    $phpIni = @"
extension_dir="$extensionDirectory"
extension=curl
extension=fileinfo
extension=intl
extension=mbstring
extension=openssl
extension=pdo_mysql
extension=sodium
extension=zip
date.timezone=America/Lima
memory_limit=512M
upload_max_filesize=25M
post_max_size=27M
"@
    [IO.File]::WriteAllText((Join-Path $runtimeRoot 'php.ini'), $phpIni.TrimStart(), [Text.UTF8Encoding]::new($false))
    $composerIni = $phpIni -replace '(?m)^extension=curl\r?\n', ''
    $composerIniPath = Join-Path $runtimeRoot 'composer.ini'
    [IO.File]::WriteAllText($composerIniPath, $composerIni.TrimStart(), [Text.UTF8Encoding]::new($false))

    $php = Join-Path $runtimeRoot 'php\php.exe'
    & $php -c (Join-Path $runtimeRoot 'php.ini') -r "foreach (['intl','mbstring','pdo_mysql','openssl'] as `$e) { if (!extension_loaded(`$e)) { fwrite(STDERR, `$e); exit(2); } }"
    if ($LASTEXITCODE -ne 0) { throw 'Required PHP extensions are unavailable.' }

    $mysql = Join-Path $runtimeRoot 'mysql\bin\mysqld.exe'
    $arguments = @('--no-defaults', ('--basedir="' + (Join-Path $runtimeRoot 'mysql') + '"'), ('--datadir="' + (Join-Path $runtimeRoot 'mysql\data') + '"'), '--bind-address=127.0.0.1', '--port=3307', '--mysqlx=OFF', '--skip-log-bin', '--require-secure-transport=ON', ('--ssl-ca="' + (Join-Path $runtimeRoot 'tls\ca.pem') + '"'), ('--ssl-cert="' + (Join-Path $runtimeRoot 'tls\server-cert.pem') + '"'), ('--ssl-key="' + (Join-Path $runtimeRoot 'tls\server-key.pem') + '"'))
    $launcher = Start-Process -FilePath $mysql -ArgumentList $arguments -WindowStyle Hidden -PassThru
    $server = Wait-ForMySql $launcher.Id
    Write-DatabaseState $server $launcher

    $env:COMPOSER_HOME = Join-Path $runtimeRoot 'composer-home'
    $env:COMPOSER_CACHE_DIR = Join-Path $runtimeRoot 'composer-cache'
    $env:COMPOSER_VENDOR_DIR = Join-Path $runtimeRoot 'vendor'
    $env:COMPOSER_AUTH = '{}'
    & $php -c $composerIniPath (Join-Path $runtimeRoot 'composer.phar') install ('--working-dir=' + (Join-Path $repo 'backend')) --no-interaction --prefer-dist --no-progress --no-scripts --no-plugins
    if ($LASTEXITCODE -ne 0) { throw 'Composer dependency installation failed.' }

    Push-Location (Join-Path $repo 'frontend')
    try {
        & npm.cmd ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
    } finally { Pop-Location }

    $manageScript = Join-Path $repo 'backend\scripts\manage-dev.ps1'
    $provisionOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $manageScript -Command prepare -Maintenance 2>&1
    $provisionCode = $LASTEXITCODE
    $provisionOutput | Write-Output
    if ($provisionCode -ne 0) { throw 'EVAL database provisioning failed.' }
    Test-Runtime
    Write-Output 'Run .\backend\scripts\manage-dev.ps1 -Command start, then double-click Abrir EVAL.cmd.'
} catch {
    if ($createdRuntime -and (Test-Path -LiteralPath $runtimeRoot)) {
        $statePath = Join-Path $runtimeRoot 'database-state.json'
        if (Test-Path -LiteralPath $statePath) {
            $currentState = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
            $expectedExe = [IO.Path]::GetFullPath((Join-Path $runtimeRoot 'mysql\bin\mysqld.exe'))
            $expectedData = [IO.Path]::GetFullPath((Join-Path $runtimeRoot 'mysql\data'))
            foreach ($id in @($currentState.pid, $currentState.launcher_pid) | Where-Object { $_ } | Select-Object -Unique) {
                $processInfo = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $id) -ErrorAction SilentlyContinue
                if ($processInfo -and $processInfo.ExecutablePath -eq $expectedExe -and $processInfo.CommandLine.Contains($expectedData)) {
                    Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
                }
            }
        }
        Start-Sleep -Milliseconds 500
        if (!(Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue)) {
            Remove-Item -LiteralPath $runtimeRoot -Recurse -Force
            if (Test-Path -LiteralPath (Join-Path $localRoot 'eval-dev')) { Remove-Item -LiteralPath (Join-Path $localRoot 'eval-dev') -Recurse -Force }
        }
    }
    throw
} finally {
    if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
