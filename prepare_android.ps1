# Script de sincronização dos arquivos web para a pasta www do Capacitor e Android assets
$targetDir = Join-Path $PSScriptRoot "www"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}

Copy-Item -Path (Join-Path $PSScriptRoot "index.html") -Destination $targetDir -Force
Copy-Item -Path (Join-Path $PSScriptRoot "manifest.json") -Destination $targetDir -Force
Copy-Item -Path (Join-Path $PSScriptRoot "sw.js") -Destination $targetDir -Force

$libPdf = Join-Path $PSScriptRoot "html2pdf.bundle.min.js"
if (Test-Path $libPdf) {
    Copy-Item -Path $libPdf -Destination $targetDir -Force
}

$iconsSource = Join-Path $PSScriptRoot "icons"
$iconsTarget = Join-Path $targetDir "icons"
if (-not (Test-Path $iconsTarget)) {
    New-Item -ItemType Directory -Path $iconsTarget | Out-Null
}
Copy-Item -Path (Join-Path $iconsSource "*") -Destination $iconsTarget -Force

$androidAssets = Join-Path $PSScriptRoot "android\app\src\main\assets\public"
if (Test-Path $androidAssets) {
    Copy-Item -Path (Join-Path $targetDir "*") -Destination $androidAssets -Recurse -Force
    Write-Output "Arquivos sincronizados diretamente para o app Android (assets/public)!"
}

Write-Output "Pasta www atualizada com sucesso para o Android Studio!"
