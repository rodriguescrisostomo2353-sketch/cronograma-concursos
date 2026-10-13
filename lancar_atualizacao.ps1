# ==============================================================================
# Script de Automação para Lançar Novas Versões do Aplicativo
# ==============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     ASSISTENTE DE LANÇAMENTO DE NOVA VERSÃO DO APP       " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
$jsonPath = Join-Path $root "version.json"
$indexPath = Join-Path $root "index.html"
$swPath = Join-Path $root "sw.js"
$gradlePath = Join-Path $root "android\app\build.gradle"

if (-not (Test-Path $jsonPath)) {
    Write-Error "Arquivo version.json não encontrado!"
    exit 1
}

$rawJson = Get-Content -Path $jsonPath -Raw -Encoding UTF8
$currentData = $rawJson | ConvertFrom-Json
$currentVer = $currentData.version
$currentApkUrl = $currentData.apkUrl

Write-Host "Versão atual registrada no version.json: " -NoNewline
Write-Host "$currentVer" -ForegroundColor Green
Write-Host ""

# 1. Pergunta a nova versão
$novaVersao = Read-Host "Digite o número da NOVA versão (exemplo: 1.2.0)"
if ([string]::IsNullOrWhiteSpace($novaVersao)) {
    Write-Host "Lançamento cancelado: nenhuma versão informada." -ForegroundColor Red
    exit 0
}
$novaVersao = $novaVersao.Trim().TrimStart('v').TrimStart('V')

# 2. Pergunta as novidades
Write-Host "`nDigite as novidades desta versão (uma por linha)." -ForegroundColor Yellow
Write-Host "Quando terminar, pressione [ENTER] em uma linha vazia:" -ForegroundColor Yellow

$novidades = @()
$contador = 1
while ($true) {
    $item = Read-Host "Novidade $contador"
    if ([string]::IsNullOrWhiteSpace($item)) {
        break
    }
    $novidades += $item.Trim()
    $contador++
}

if ($novidades.Count -eq 0) {
    $novidades += "Melhorias gerais e correções de estabilidade."
}

# 3. Pergunta a URL do APK
Write-Host "`nURL de download do APK para esta versão:" -ForegroundColor Yellow
Write-Host "Atual: $currentApkUrl" -ForegroundColor Gray
$novoApkUrl = Read-Host "Pressione ENTER para manter a atual ou digite a nova URL"
if ([string]::IsNullOrWhiteSpace($novoApkUrl)) {
    $novoApkUrl = $currentApkUrl
} else {
    $novoApkUrl = $novoApkUrl.Trim()
}

Write-Host "`nAtualizando arquivos..." -ForegroundColor Cyan

# A. Atualizar index.html (const APP_VERSION)
if (Test-Path $indexPath) {
    $indexContent = Get-Content -Path $indexPath -Raw -Encoding UTF8
    $indexContent = $indexContent -replace 'const APP_VERSION\s*=\s*"[^"]+";', "const APP_VERSION = `"$novaVersao`";"
    [System.IO.File]::WriteAllText($indexPath, $indexContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  [OK] index.html: APP_VERSION atualizado para `"$novaVersao`"" -ForegroundColor Green
}

# B. Atualizar sw.js (CACHE_NAME)
if (Test-Path $swPath) {
    $swContent = Get-Content -Path $swPath -Raw -Encoding UTF8
    if ($swContent -match "cronograma-concursos-v(\d+)") {
        $nextNum = [int]$matches[1] + 1
        $swContent = $swContent -replace "cronograma-concursos-v\d+", "cronograma-concursos-v$nextNum"
        Write-Host "  [OK] sw.js: Cache incrementado para 'cronograma-concursos-v$nextNum'" -ForegroundColor Green
    } else {
        $swContent = $swContent -replace "cronograma-concursos-[a-zA-Z0-9\.\-]+", "cronograma-concursos-v$novaVersao"
        Write-Host "  [OK] sw.js: Cache atualizado para versão $novaVersao" -ForegroundColor Green
    }
    [System.IO.File]::WriteAllText($swPath, $swContent, [System.Text.UTF8Encoding]::new($false))
}

# C. Atualizar version.json
$hoje = (Get-Date).ToString("yyyy-MM-dd")

# Monta novo histórico mantendo versões anteriores
$novoHistorico = @()
$novoHistorico += [PSCustomObject]@{
    version = $currentData.version
    date = $currentData.date
    notes = $currentData.notes
}
if ($currentData.history) {
    foreach ($h in $currentData.history) {
        $novoHistorico += $h
    }
}

$novoJsonObj = [PSCustomObject]@{
    version = $novaVersao
    date = $hoje
    notes = $novidades
    apkUrl = $novoApkUrl
    history = $novoHistorico
}

$novoJsonTexto = $novoJsonObj | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($jsonPath, $novoJsonTexto, [System.Text.UTF8Encoding]::new($false))
Write-Host "  [OK] version.json atualizado com sucesso!" -ForegroundColor Green

# D. Atualizar build.gradle (versionCode +1 e versionName)
if (Test-Path $gradlePath) {
    $gradleContent = Get-Content -Path $gradlePath -Raw -Encoding UTF8
    if ($gradleContent -match "versionCode\s+(\d+)") {
        $antigoCode = [int]$matches[1]
        $novoCode = $antigoCode + 1
        $gradleContent = $gradleContent -replace "versionCode\s+\d+", "versionCode $novoCode"
        Write-Host "  [OK] android/app/build.gradle: versionCode incrementado para $novoCode" -ForegroundColor Green
    }
    $gradleContent = $gradleContent -replace 'versionName\s+"[^"]+"', "versionName `"$novaVersao`""
    Write-Host "  [OK] android/app/build.gradle: versionName atualizado para `"$novaVersao`"" -ForegroundColor Green
    [System.IO.File]::WriteAllText($gradlePath, $gradleContent, [System.Text.UTF8Encoding]::new($false))
}

# E. Testar resposta do link do APK na internet
Write-Host "`nVerificando disponibilidade online do link do APK..." -ForegroundColor Cyan
Write-Host "URL: $novoApkUrl" -ForegroundColor Gray
try {
    $testResp = Invoke-WebRequest -Uri $novoApkUrl -Method Head -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  [OK] Link do APK esta ativo e respondendo! (Status: $($testResp.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  [ATENCAO] O link do APK ainda nao respondeu online: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  -> Isto e normal caso a Release ainda nao tenha sido criada no GitHub." -ForegroundColor Gray
    Write-Host "  -> Certifique-se de anexar o arquivo com o nome exato 'app-cronograma.apk' e clicar no botao verde 'Publish release' (nao deixe em rascunho/draft)." -ForegroundColor Yellow
}

# F. Sincronizar arquivos para o Android Studio
Write-Host "`nSincronizando arquivos para www e Android Studio..." -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File (Join-Path $root "prepare_android.ps1")

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "       VERSÃO $novaVersao PREPARADA COM SUCESSO!         " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos para finalizar o lançamento:" -ForegroundColor Yellow
Write-Host "1. Gere o novo APK rodando:" -ForegroundColor White
Write-Host "   powershell -ExecutionPolicy Bypass -File .\sync_and_build_apk.ps1" -ForegroundColor Cyan
Write-Host "   (O arquivo sera salvo em: apk\app-cronograma.apk)" -ForegroundColor Gray
Write-Host "2. No GitHub (github.com/rodriguescrisostomo2353-sketch/cronograma-concursos/releases):" -ForegroundColor White
Write-Host "   - Crie uma nova Release (Draft a new release)." -ForegroundColor Gray
Write-Host "   - Tag: v$novaVersao" -ForegroundColor Gray
Write-Host "   - Anexe o arquivo: apk\app-cronograma.apk" -ForegroundColor Gray
Write-Host "   - Clique em 'Publish release' (obrigatorio para que o download funcione)." -ForegroundColor Yellow
Write-Host "3. Publique o site executando 'publication.bat' ou enviando para o GitHub Pages." -ForegroundColor White
Write-Host ""
