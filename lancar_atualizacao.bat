@echo off
title Lancar Nova Versao do Aplicativo
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lancar_atualizacao.ps1"
pause
