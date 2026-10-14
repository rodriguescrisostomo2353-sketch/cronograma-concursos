@echo off
chcp 65001 >nul
title Gerar Novo APK Android
color 0B

echo ==========================================================
echo        GERANDO NOVO APK ATUALIZADO (ANDROID)
echo ==========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_and_build_apk.ps1"
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
