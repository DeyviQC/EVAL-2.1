<#
.SYNOPSIS
    EVAL LAN & WLAN Deployment Setup Script
    Configures TLS certificates and network settings for school local network access.

.DESCRIPTION
    1. Detects primary IPv4 address on the local network (Wi-Fi or Ethernet).
    2. Generates an institutional multi-SAN TLS certificate (127.0.0.1, LAN IP, and local hostnames).
    3. Checks or configures Windows Defender Firewall inbound rule for port 8443.
    4. Displays connection URLs for school tablets and classroom devices.
#>

param(
    [string]$CustomIp = "",
    [string]$DomainName = "eval.mercedes.local",
    [int]$HttpsPort = 8443
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = [IO.Path]::GetFullPath((Join-Path $scriptDir "..\.."))
$devRoot = Join-Path $repo ".local\eval-dev"
$runtimeRoot = Join-Path $repo ".local\runtime"
$php = Join-Path $runtimeRoot "php\php.exe"
$ini = Join-Path $runtimeRoot "php.ini"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  EVAL - Configuración de Red Institucional (LAN / WLAN)  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Detect LAN IPv4 Address
$lanIp = $CustomIp
if ([string]::IsNullOrWhiteSpace($lanIp)) {
    $activeAdapter = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.IPAddress -notlike "127.*" -and 
        $_.IPAddress -notlike "169.254.*" -and 
        $_.InterfaceAlias -notlike "*Loopback*" -and
        $_.InterfaceAlias -notlike "*vEthernet*"
    } | Select-Object -First 1

    if ($activeAdapter) {
        $lanIp = $activeAdapter.IPAddress
        Write-Host "[Red Local] Adaptador detectado: $($activeAdapter.InterfaceAlias)" -ForegroundColor Gray
        Write-Host "[Red Local] IP del Servidor: $lanIp" -ForegroundColor Green
    } else {
        $lanIp = "192.168.1.100"
        Write-Host "[Red Local] No se detectó adaptador activo. Usando IP por defecto: $lanIp" -ForegroundColor Yellow
    }
} else {
    Write-Host "[Red Local] Usando IP personalizada: $lanIp" -ForegroundColor Green
}

# 2. Generate Multi-SAN TLS Certificate
Write-Host "[Certificado] Generando certificado TLS con Nombres Alternativos (SAN)..." -ForegroundColor Cyan

$sanList = @(
    "IP:127.0.0.1",
    "IP:$lanIp",
    "DNS:localhost",
    "DNS:$DomainName"
)
$sanString = $sanList -join ","

$cnfContent = @"
[req]
distinguished_name=dn
x509_extensions=ext
prompt=no
[dn]
CN=EVAL I.E. Nuestra Señora de las Mercedes
O=I.E. Nuestra Señora de las Mercedes
OU=Plataforma Educativa EVAL
L=Ayacucho
C=PE
[ext]
subjectAltName=$sanString
basicConstraints=critical,CA:TRUE
keyUsage=critical,digitalSignature,keyEncipherment,keyCertSign
extendedKeyUsage=serverAuth
"@

$cnfPath = Join-Path $devRoot "openssl-lan.cnf"
[IO.File]::WriteAllText($cnfPath, $cnfContent)

$certGenScript = @"
<?php
declare(strict_types=1);
`$cnf = '$($cnfPath.Replace('\', '/'))';
`$devRoot = '$($devRoot.Replace('\', '/'))';
`$options = ['config' => `$cnf, 'private_key_bits' => 2048, 'digest_alg' => 'sha256'];
`$key = openssl_pkey_new(`$options);
`$csr = openssl_csr_new(['commonName' => 'EVAL Colegio Mercedes'], `$key, `$options);
`$cert = openssl_csr_sign(`$csr, null, `$key, 365, `$options);
if (!`$key || !`$csr || !`$cert || !openssl_x509_export(`$cert, `$pem) || !openssl_pkey_export(`$key, `$priv, null, `$options)) {
    exit(2);
}
file_put_contents(`$devRoot . '/cert.pem', `$pem);
file_put_contents(`$devRoot . '/key.pem', `$priv);
echo "Certificado LAN generado con éxito.\n";
"@

$tempPhp = Join-Path ([IO.Path]::GetTempPath()) "eval-cert-$([Guid]::NewGuid().ToString('N')).php"
[IO.File]::WriteAllText($tempPhp, $certGenScript)

try {
    $out = & $php -c $ini -d display_errors=0 $tempPhp
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Certificado institucional creado: cert.pem (SANs: $sanString)" -ForegroundColor Green
    } else {
        Write-Host "  [!] Error al generar certificado con PHP" -ForegroundColor Red
    }
}
finally {
    Remove-Item -LiteralPath $tempPhp -Force -ErrorAction SilentlyContinue
}

# 3. Check Windows Firewall
Write-Host "[Firewall] Verificando regla de entrada para puerto $HttpsPort..." -ForegroundColor Cyan
$existingRule = Get-NetFirewallRule -DisplayName "*EVAL*LAN*" -ErrorAction SilentlyContinue
if (!$existingRule) {
    $existingRule = Get-NetFirewallRule -Name "EVAL_HTTPS_LAN" -ErrorAction SilentlyContinue
}

if ($existingRule) {
    Write-Host "  [OK] Regla de Firewall existente: $($existingRule.DisplayName)" -ForegroundColor Green
} else {
    Write-Host "  [i] Para habilitar el puerto en Windows Firewall, ejecuta como Administrador:" -ForegroundColor Yellow
    Write-Host "      New-NetFirewallRule -Name 'EVAL_HTTPS_LAN' -DisplayName 'EVAL Plataforma Educativa (HTTPS)' -Direction Inbound -LocalPort $HttpsPort -Protocol TCP -Action Allow -Profile Domain,Private" -ForegroundColor Gray
}

# 4. Summary & Instructions
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Configuración de Red Completa                           " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Acceso local en el servidor:  https://127.0.0.1:$HttpsPort" -ForegroundColor Cyan
Write-Host "  Acceso desde tablets y aulas: https://${lanIp}:${HttpsPort}" -ForegroundColor Yellow
Write-Host "  Nombre interno opcional:      https://${DomainName}:${HttpsPort}" -ForegroundColor Gray
Write-Host ""
Write-Host "  Para instalar el certificado institucional en tablets Android / Windows:" -ForegroundColor Gray
Write-Host "  Copia '$devRoot\cert.pem' como 'eval-ca.crt' e instálalo como Autoridad de Certificación de confianza." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
