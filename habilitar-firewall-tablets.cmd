@echo off
setlocal
title EVAL - Habilitar Firewall para Tablets
cls
echo ========================================================================
echo   EVAL v2.1 - Habilitador de Windows Firewall para Tablets
echo   Colegio I.E. Nuestra Senora de las Mercedes
echo ========================================================================
echo.

:: Verificar privilegios de administrador
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [i] Se requieren privilegios de Administrador para configurar el Firewall.
    echo [i] Solicitando confirmacion de Windows (UAC)...
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb runAs"
    exit /b
)

echo [1/2] Verificando regla existente en el Firewall...
netsh advfirewall firewall show rule name="EVAL_HTTPS_LAN" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] La regla 'EVAL_HTTPS_LAN' ya existia. Se actualizara para asegurar acceso.
    netsh advfirewall firewall delete rule name="EVAL_HTTPS_LAN" >nul 2>&1
)

echo [2/2] Registrando regla de entrada para puerto 8443 (TCP)...
netsh advfirewall firewall add rule name="EVAL_HTTPS_LAN" dir=in action=allow protocol=TCP localport=8443 profile=private,domain >nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================================
    echo   [EXITO] Puerto TCP 8443 abierto correctamente en Windows Firewall.
    echo   Las tablets ahora pueden conectarse a la laptop en la red local.
    echo ========================================================================
    echo.
) else (
    echo.
    echo [!] Ocurrio una advertencia al registrar la regla.
    echo     Intentando registrar via PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "New-NetFirewallRule -Name 'EVAL_HTTPS_LAN' -DisplayName 'EVAL Plataforma Educativa (HTTPS)' -Direction Inbound -LocalPort 8443 -Protocol TCP -Action Allow -Profile Domain,Private -ErrorAction SilentlyContinue"
    echo [OK] Operacion completada.
)

echo.
pause
