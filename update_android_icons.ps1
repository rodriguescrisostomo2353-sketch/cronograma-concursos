$resPath = "C:\Users\Thallisson\Desktop\projeto aba\android\app\src\main\res"
$icon192 = "C:\Users\Thallisson\Desktop\projeto aba\icons\icon-192.png"
$icon512 = "C:\Users\Thallisson\Desktop\projeto aba\icons\icon-512.png"

# Remove conflitos do mipmap-anydpi-v26 (apenas arquivos XML devem ficar lá)
$anydpiPath = Join-Path $resPath "mipmap-anydpi-v26"
if (Test-Path $anydpiPath) {
    Remove-Item (Join-Path $anydpiPath "ic_launcher.png") -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $anydpiPath "ic_launcher_round.png") -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $anydpiPath "ic_launcher_foreground.png") -Force -ErrorAction SilentlyContinue
}

# Copiar os ícones PNG apenas para as pastas de densidade (hdpi, mdpi, xhdpi, xxhdpi, xxxhdpi)
Get-ChildItem -Path $resPath -Directory -Filter "mipmap-*" | Where-Object { $_.Name -ne "mipmap-anydpi-v26" } | ForEach-Object {
    Copy-Item $icon192 -Destination (Join-Path $_.FullName "ic_launcher.png") -Force
    Copy-Item $icon192 -Destination (Join-Path $_.FullName "ic_launcher_round.png") -Force
    Copy-Item $icon512 -Destination (Join-Path $_.FullName "ic_launcher_foreground.png") -Force
}

Write-Output "Ícones do app Android atualizados com sucesso e conflitos de XML removidos!"
