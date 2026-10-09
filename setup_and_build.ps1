$ErrorActionPreference = "Stop"

# 1. Configurar variáveis de ambiente da sessão
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin;" + $env:Path

Write-Host "=== TESTANDO VERSÕES ===" -ForegroundColor Cyan
& "C:\Program Files\nodejs\node.exe" -v
& "C:\Program Files\nodejs\npm.cmd" -v
& "$env:JAVA_HOME\bin\javac.exe" -version

Write-Host "`n=== 1. PREPARANDO PASTA WWW ===" -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "prepare_android.ps1")

Write-Host "`n=== 2. INSTALANDO DEPENDÊNCIAS DO CAPACITOR (npm install) ===" -ForegroundColor Cyan
& "C:\Program Files\nodejs\npm.cmd" install

Write-Host "`n=== 3. ADICIONANDO PLATAFORMA ANDROID ===" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $PSScriptRoot "android"))) {
    & "C:\Program Files\nodejs\npx.cmd" cap add android
} else {
    Write-Host "Plataforma Android já adicionada."
}

Write-Host "`n=== 4. SINCRONIZANDO PROJETO COM CAPACITOR (npx cap sync) ===" -ForegroundColor Cyan
& "C:\Program Files\nodejs\npx.cmd" cap sync android

Write-Host "`n=== PROCESSO DO CAPACITOR FINALIZADO COM SUCESSO! ===" -ForegroundColor Green
