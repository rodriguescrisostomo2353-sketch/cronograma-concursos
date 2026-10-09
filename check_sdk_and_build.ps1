$ErrorActionPreference = "Continue"

$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
Write-Host "Verificando conteudo do SDK em: $sdkPath" -ForegroundColor Cyan
Get-ChildItem -Path $sdkPath | Select-Object Name

# Escrever local.properties se nao existir
$localProps = Join-Path $PSScriptRoot "android\local.properties"
$escapedSdk = $sdkPath.Replace("\", "\\")
"sdk.dir=$escapedSdk" | Set-Content -Path $localProps -Encoding ASCII
Write-Host "local.properties configurado com sucesso com sdk.dir=$escapedSdk" -ForegroundColor Green
