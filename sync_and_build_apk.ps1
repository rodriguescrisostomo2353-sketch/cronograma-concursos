$ErrorActionPreference = "Stop"

# 1. Configurar variáveis de ambiente da sessão
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\bin;$env:LOCALAPPDATA\Android\Sdk\platform-tools;" + $env:Path

Write-Host "=== 1. PREPARANDO PASTA WWW ===" -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "prepare_android.ps1")

Write-Host "`n=== 2. SINCRONIZANDO COM O CAPACITOR (npx cap sync) ===" -ForegroundColor Cyan
& "C:\Program Files\nodejs\npx.cmd" cap sync android

Write-Host "`n=== 3. COMPILANDO NOVO APK ANDROID COM GRADLE ===" -ForegroundColor Cyan
Set-Location (Join-Path $PSScriptRoot "android")
& .\gradlew.bat assembleDebug

Write-Host "`n=== 4. COPIANDO APK ATUALIZADO ===" -ForegroundColor Green
$apkPath = Join-Path $PSScriptRoot "android\app\build\outputs\apk\debug\app-debug.apk"

if (Test-Path $apkPath) {
    $destFolder = Join-Path $PSScriptRoot "apk"
    if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder | Out-Null
    }
    $finalApk = Join-Path $destFolder "CronogramaDeEstudos.apk"
    Copy-Item $apkPath -Destination $finalApk -Force
    Write-Host "APK atualizado com sucesso em: $finalApk" -ForegroundColor Green
} else {
    Write-Error "O arquivo APK não foi encontrado no caminho esperado!"
}
