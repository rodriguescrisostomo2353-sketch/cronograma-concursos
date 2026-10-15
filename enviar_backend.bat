@echo off
title Enviar Backend C# para o GitHub (BACK-END-ABA)
cd /d "%~dp0backend-csharp"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend-csharp\enviar.ps1"
pause
