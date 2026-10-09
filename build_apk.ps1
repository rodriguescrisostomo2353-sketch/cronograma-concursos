$ErrorActionPreference = "Stop"

# 1. Configurar variáveis de ambiente essenciais
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin;$env:LOCALAPPDATA\Android\Sdk\platform-tools;" + $env:Path

Write-Host "=== INICIANDO COMPILAÇÃO DO APK ANDROID ===" -ForegroundColor Cyan
Set-Location (Join-Path $PSScriptRoot "android")

Write-Host "Executando Gradle assembleDebug..." -ForegroundColor Yellow
& .\gradlew.bat assembleDebug

Write-Host "`n=== COMPILAÇÃO CONCLUÍDA! ===" -ForegroundColor Green
$apkPath = Join-Path $PSScriptRoot "android\app\build\outputs\apk\debug\app-debug.apk"

if (Test-Path $apkPath) {
    Write-Host "APK gerado com sucesso em: $apkPath" -ForegroundColor Green
    $destFolder = Join-Path $PSScriptRoot "apk"
    if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder | Out-Null
    }
    $finalApk = Join-Path $destFolder "CronogramaDeEstudos.apk"
    Copy-Item $apkPath -Destination $finalApk -Force
    Write-Host "Cópia criada em pasta de fácil acesso: $finalApk" -ForegroundColor Cyan
} else {
    Write-Error "O arquivo APK não foi encontrado no caminho esperado!"
}
