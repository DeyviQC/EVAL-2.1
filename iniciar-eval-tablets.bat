@echo off
title EVAL - Servidor Local para Tablets (I.E. Nuestra Senora de las Mercedes)
cls
echo ========================================================================
echo   EVAL v2.1 - Iniciando Servidor para Tablets y Red Local
echo   Colegio I.E. Nuestra Senora de las Mercedes
echo ========================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend\scripts\start-tablet-mode.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocurrio un error al ejecutar el servidor.
    pause
)
