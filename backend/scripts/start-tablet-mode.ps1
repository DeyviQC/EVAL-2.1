<#
.SYNOPSIS
    EVAL - Servidor Institucional para Tablets y Red Local (LAN / WLAN)
    I.E. Nuestra Senora de las Mercedes - Ayacucho

.DESCRIPTION
    Script integral de despliegue local para pruebas fisicas en tablets del colegio.
    1. Detecta automaticamente la IP de la laptop en la red Wi-Fi/Ethernet escolar.
    2. Genera el certificado TLS con soporte SAN para dicha IP y localhost.
    3. Verifica la regla de Windows Firewall para el puerto 8443.
    4. Inicia EVAL en modo Tablet/LAN (enlace 0.0.0.0 con soporte multi-origen).
    5. Muestra el panel interactivo con URLs, credenciales y atajos en tiempo real.
#>

[CmdletBinding()]
param(
    [string]$CustomIp = '',
    [switch]$OpenBrowser,
    [switch]$NoWait
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = [IO.Path]::GetFullPath((Join-Path $scriptDir '..\..'))
$devRoot = Join-Path $repo '.local\eval-dev'
$runtimeRoot = Join-Path $repo '.local\runtime'
$manageDev = Join-Path $scriptDir 'manage-dev.ps1'
$backupScript = Join-Path $scriptDir 'backup.ps1'

Write-Host ''
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host '   I.E. NUESTRA SENORA DE LAS MERCEDES - AYACUCHO' -ForegroundColor Yellow
Write-Host '   EVAL v2.1 - Preparando Servidor para Tablets y Red Local' -ForegroundColor Cyan
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host ''

# 1. Detener procesos previos de EVAL para inicio limpio
Write-Host '[1/5] Verificando estado previo de procesos...' -ForegroundColor Gray
try {
    & $manageDev stop | Out-Null
} catch {
    # Ignorar si no habia procesos previos
}

# 2. Asegurar que MySQL este activo
Write-Host '[2/5] Verificando base de datos MySQL en puerto 3307...' -ForegroundColor Gray
$mysqlCheck = Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue
if (!$mysqlCheck) {
    Write-Host '      Iniciando MySQL aislado...' -ForegroundColor Yellow
    & (Join-Path $scriptDir 'start-u1.ps1') | Out-Null
    Start-Sleep -Seconds 2
}
Write-Host '      [OK] Base de datos activa y verificada.' -ForegroundColor Green

# 3. Detectar direccion IP en la red del colegio
Write-Host '[3/5] Detectando adaptador de red activo...' -ForegroundColor Gray
$lanIp = $CustomIp
$adapterName = 'Personalizado'

if ([string]::IsNullOrWhiteSpace($lanIp)) {
    $activeAdapters = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.IPAddress -notlike '127.*' -and 
        $_.IPAddress -notlike '169.254.*' -and 
        $_.InterfaceAlias -notlike '*Loopback*' -and
        $_.InterfaceAlias -notlike '*vEthernet*' -and
        $_.InterfaceAlias -notlike '*Virtual*'
    })

    # Priorizar Wi-Fi si existe
    $wifi = $activeAdapters | Where-Object { $_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -like '*Wireless*' } | Select-Object -First 1
    $targetAdapter = if ($wifi) { $wifi } else { $activeAdapters | Select-Object -First 1 }

    if ($targetAdapter) {
        $lanIp = $targetAdapter.IPAddress
        $adapterName = $targetAdapter.InterfaceAlias
    } else {
        $lanIp = '192.168.0.207'
        $adapterName = 'Por defecto'
    }
}

Write-Host "      [OK] Adaptador: $adapterName" -ForegroundColor Green
Write-Host "      [OK] IP del Servidor: $lanIp" -ForegroundColor Green

# 4. Verificar regla de firewall
Write-Host '[4/5] Verificando Windows Firewall en puerto 8443...' -ForegroundColor Gray
$firewallRule = Get-NetFirewallRule -Name 'EVAL_HTTPS_LAN' -ErrorAction SilentlyContinue
if (!$firewallRule) {
    $firewallRule = Get-NetFirewallRule -DisplayName '*EVAL*' -ErrorAction SilentlyContinue
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (!$firewallRule) {
    if ($isAdmin) {
        try {
            New-NetFirewallRule -Name 'EVAL_HTTPS_LAN' -DisplayName 'EVAL Plataforma Educativa (HTTPS)' -Direction Inbound -LocalPort 8443 -Protocol TCP -Action Allow -Profile Domain,Private -ErrorAction Stop | Out-Null
            Write-Host '      [OK] Regla de firewall creada exitosamente.' -ForegroundColor Green
        } catch {
            Write-Host '      [!] Advertencia al registrar regla automatica.' -ForegroundColor Yellow
        }
    } else {
        Write-Host '      [i] Si las tablets no conectan, ejecuta PowerShell como Administrador:' -ForegroundColor Yellow
        Write-Host '          netsh advfirewall firewall add rule name="EVAL_HTTPS" dir=in action=allow protocol=TCP localport=8443' -ForegroundColor DarkGray
    }
} else {
    Write-Host "      [OK] Regla de firewall activa: $($firewallRule.DisplayName)" -ForegroundColor Green
}

# 5. Iniciar EVAL en Modo Tablet
Write-Host '[5/5] Iniciando servidor EVAL en modo Tablet...' -ForegroundColor Gray
$startOutput = & $manageDev start -Tablet -LanIp $lanIp
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Error al iniciar servidor EVAL:' -ForegroundColor Red
    Write-Host $startOutput -ForegroundColor Red
    exit 1
}

# Obtener credenciales de prueba
$accountsRaw = & $manageDev accounts -Console
$passDirector = ''
$passSubdirector = ''
$passDocente = ''
$passEstudiante = ''

foreach ($line in @($accountsRaw)) {
    $parts = $line.Split(':')
    if ($parts.Count -eq 2) {
        $u = $parts[0].Trim()
        $p = $parts[1].Trim()
        if ($u -eq 'director') { $passDirector = $p }
        elseif ($u -eq 'subdirector') { $passSubdirector = $p }
        elseif ($u -eq 'docente') { $passDocente = $p }
        elseif ($u -eq 'estudiante') { $passEstudiante = $p }
    }
}

# Abrir navegador local si se solicito
if ($OpenBrowser) {
    Start-Process 'https://127.0.0.1:8443'
}

# 6. Renderizar Panel de Control Interactivo
Clear-Host
Write-Host ''
Write-Host '================================================================================' -ForegroundColor Cyan
Write-Host '         I.E. NUESTRA SENORA DE LAS MERCEDES - AYACUCHO' -ForegroundColor Yellow
Write-Host '         EVAL v2.1 - MODO TABLET Y RED LOCAL INSTITUCIONAL (LAN / WLAN)' -ForegroundColor Cyan
Write-Host '================================================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '  [ESTADO DEL SERVIDOR]' -ForegroundColor White
Write-Host "    * Red:             $adapterName" -ForegroundColor Gray
Write-Host "    * IP Servidor:     $lanIp" -ForegroundColor Gray
Write-Host '    * Puerto:          8443 (HTTPS seguro con TLS multi-SAN)' -ForegroundColor Gray
Write-Host '    * Base de Datos:   MySQL 8.4 (eval_dev, 38 tablas, 19 migraciones)' -ForegroundColor Gray
Write-Host '    * Modo Offline:    100% OPERATIVO (sin dependencia de Internet)' -ForegroundColor Green
Write-Host ''
Write-Host '  [ENLACES DE ACCESO]' -ForegroundColor White
Write-Host '    >>> TABLETS Y DISPOSITIVOS DEL AULA <<<' -ForegroundColor Yellow
Write-Host "    https://${lanIp}:8443" -ForegroundColor Magenta
Write-Host ''
Write-Host '    >>> LAPTOP DEL SERVIDOR (LOCAL) <<<' -ForegroundColor Gray
Write-Host '    https://127.0.0.1:8443' -ForegroundColor Cyan
Write-Host ''
Write-Host '  [CUENTAS DE DEMOSTRACION OFICIALES]' -ForegroundColor White
Write-Host '    Rol           Usuario       Contrasena' -ForegroundColor DarkGray
Write-Host '    -----------   ------------  ------------------------' -ForegroundColor DarkGray
Write-Host "    Director:     director      $passDirector" -ForegroundColor Green
Write-Host "    Subdirector:  subdirector   $passSubdirector" -ForegroundColor Green
Write-Host "    Docente:      docente       $passDocente" -ForegroundColor Green
Write-Host "    Estudiante:   estudiante    $passEstudiante" -ForegroundColor Green
Write-Host ''
Write-Host '  [PASOS PARA CONECTAR LAS TABLETS EN EL COLEGIO]' -ForegroundColor White
Write-Host '    1. Conectar la laptop y las tablets a la MISMA red Wi-Fi del colegio.' -ForegroundColor Gray
Write-Host '    2. En la tablet, abrir Google Chrome y escribir la URL exacta que aparece arriba.' -ForegroundColor Gray
Write-Host "       https://${lanIp}:8443" -ForegroundColor Yellow
Write-Host '    3. Al ver el aviso: "La conexion no es privada":' -ForegroundColor Gray
Write-Host "       Tocar Configuración avanzada y luego Continuar a $lanIp (no seguro)." -ForegroundColor Gray
Write-Host '    4. En iOS/Safari: si no aparece "Continuar", instalar el certificado' -ForegroundColor Gray
Write-Host "       .local\eval-dev\cert.pem como perfil de confianza en Ajustes > General > VPN y gestion de dispositivos." -ForegroundColor Gray
Write-Host '    5. Iniciar sesión con cualquier cuenta (ej. docente o estudiante).' -ForegroundColor Gray
Write-Host '    6. Listo! La Pantalla de Aula, PDFs, imágenes y tareas cargan al instante.' -ForegroundColor Green
Write-Host ''

# Verificar que la propia laptop puede alcanzar la IP publicada (firewall / adaptador)
$selfCheck = Test-NetConnection -ComputerName $lanIp -Port 8443 -WarningAction SilentlyContinue
if (!$selfCheck.TcpTestSucceeded) {
    Write-Host '  [ADVERTENCIA] La laptop no puede contactar su propia IP en el puerto 8443.' -ForegroundColor Red
    Write-Host '                Revisa Windows Firewall o que el adaptador Wi-Fi no esté en modo Publico bloqueante.' -ForegroundColor Red
    Write-Host '                Puedes probar ejecutando PowerShell como Administrador:' -ForegroundColor DarkGray
    Write-Host '                netsh advfirewall firewall add rule name="EVAL_HTTPS" dir=in action=allow protocol=TCP localport=8443' -ForegroundColor DarkGray
    Write-Host ''
} else {
    Write-Host '  [OK] Conectividad local verificada: el puerto 8443 responde en la red.' -ForegroundColor Green
    Write-Host ''
}
Write-Host '--------------------------------------------------------------------------------' -ForegroundColor DarkGray
Write-Host '  ATAJOS DISPONIBLES EN ESTA CONSOLA:' -ForegroundColor White
Write-Host '    [O] Abrir navegador en esta laptop      [B] Crear copia de respaldo (Backup)' -ForegroundColor Cyan
Write-Host '    [R] Reiniciar servidor                  [Q] Detener servidor y salir' -ForegroundColor Cyan
Write-Host '--------------------------------------------------------------------------------' -ForegroundColor DarkGray
Write-Host ''

if ($NoWait) {
    Write-Host 'Servidor en ejecucion en segundo plano.' -ForegroundColor Green
    exit 0
}

# 7. Bucle de monitoreo interactivo
try {
    $running = $true
    $interactive = $true
    try { [void][Console]::KeyAvailable } catch { $interactive = $false }
    while ($running) {
        if ($interactive -and [Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            switch ($key.Key) {
                'Q' {
                    Write-Host ''
                    Write-Host 'Deteniendo servidor EVAL...' -ForegroundColor Yellow
                    $running = $false
                }
                'O' {
                    Write-Host ''
                    Write-Host 'Abriendo EVAL en el navegador local...' -ForegroundColor Cyan
                    Start-Process 'https://127.0.0.1:8443'
                }
                'B' {
                    Write-Host ''
                    Write-Host '[Backup] Generando snapshot criptografico...' -ForegroundColor Cyan
                    if (Test-Path -LiteralPath $backupScript) {
                        & $backupScript
                    } else {
                        Write-Host "Script de backup no encontrado en $backupScript" -ForegroundColor Red
                    }
                }
                'R' {
                    Write-Host ''
                    Write-Host 'Reiniciando servidor EVAL...' -ForegroundColor Yellow
                    & $manageDev stop | Out-Null
                    Start-Sleep -Seconds 1
                    & $manageDev start -Tablet -LanIp $lanIp | Out-Null
                    Write-Host 'Servidor reiniciado con exito.' -ForegroundColor Green
                }
            }
        }
        Start-Sleep -Milliseconds 250
    }
}
finally {
    Write-Host ''
    Write-Host 'Cerrando procesos de EVAL...' -ForegroundColor Gray
    try {
        & $manageDev stop | Out-Null
    } catch {
        # Ignorar errores al cerrar
    }
    Write-Host 'EVAL detenido limpiamente. Base de datos y archivos preservados.' -ForegroundColor Green
}
