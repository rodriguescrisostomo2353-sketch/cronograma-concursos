# Script de sincronização dos arquivos web para a pasta www do Capacitor e Android assets
$targetDir = Join-Path $PSScriptRoot "www"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}

Copy-Item -Path (Join-Path $PSScriptRoot "index.html") -Destination $targetDir -Force
Copy-Item -Path (Join-Path $PSScriptRoot "manifest.json") -Destination $targetDir -Force
Copy-Item -Path (Join-Path $PSScriptRoot "sw.js") -Destination $targetDir -Force
Copy-Item -Path (Join-Path $PSScriptRoot "version.json") -Destination $targetDir -Force

$libPdf = Join-Path $PSScriptRoot "html2pdf.bundle.min.js"
if (Test-Path $libPdf) {
    Copy-Item -Path $libPdf -Destination $targetDir -Force
}

$studyCss = Join-Path $PSScriptRoot "study-hours.css"
if (Test-Path $studyCss) {
    Copy-Item -Path $studyCss -Destination $targetDir -Force
}


$srcFolder = Join-Path $PSScriptRoot "src"
if (Test-Path $srcFolder) {
    Copy-Item -Path $srcFolder -Destination $targetDir -Recurse -Force
}

$distFolder = Join-Path $PSScriptRoot "dist"
if (Test-Path $distFolder) {
    Copy-Item -Path $distFolder -Destination $targetDir -Recurse -Force
}


$iconsSource = Join-Path $PSScriptRoot "icons"
$iconsTarget = Join-Path $targetDir "icons"
if (-not (Test-Path $iconsTarget)) {
    New-Item -ItemType Directory -Path $iconsTarget | Out-Null
}
Copy-Item -Path (Join-Path $iconsSource "*") -Destination $iconsTarget -Force

$assetsSource = Join-Path $PSScriptRoot "assets"
$assetsTarget = Join-Path $targetDir "assets"
if (-not (Test-Path $assetsTarget)) {
    New-Item -ItemType Directory -Path $assetsTarget | Out-Null
}
Copy-Item -Path (Join-Path $assetsSource "*") -Destination $assetsTarget -Force

$androidAssets = Join-Path $PSScriptRoot "android\app\src\main\assets\public"
if (Test-Path $androidAssets) {
    Copy-Item -Path (Join-Path $targetDir "*") -Destination $androidAssets -Recurse -Force
    Write-Output "Arquivos sincronizados diretamente para o app Android (assets/public)!"
}

Write-Output "Pasta www atualizada com sucesso para o Android Studio!"
