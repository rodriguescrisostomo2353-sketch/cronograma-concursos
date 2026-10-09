@echo off
title Enviar Alteracoes para o GitHub
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0enviar.ps1"
pause
