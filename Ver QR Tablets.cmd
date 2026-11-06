@echo off
setlocal
title EVAL - Ver Codigo QR para Tablets
cls
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0backend\scripts\generate-qr-portal.ps1'; Start-Process (Join-Path '%~dp0' '.local\eval-dev\portal-tablets.html')"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Ocurrio un error al abrir el portal QR.
    pause
)
