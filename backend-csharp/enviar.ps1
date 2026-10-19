# ==============================================================================
# Script de Envio do Backend C# para o Repositório GitHub (BACK-END-ABA)
# ==============================================================================
param (
    [string]$Mensagem = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      ENVIO AUTOMÁTICO DO BACKEND C# (BACK-END-ABA)       " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
Set-Location $root

if ([string]::IsNullOrWhiteSpace($Mensagem)) {
    $dataHora = (Get-Date).ToString("yyyy-MM-dd HH:mm")
    $Mensagem = "Atualizacao do backend C# ($dataHora)"
}

Write-Host "Adicionando arquivos..." -ForegroundColor Cyan
& git add .

$staged = & git status --porcelain
if (-not [string]::IsNullOrWhiteSpace($staged)) {
    Write-Host "Criando commit: $Mensagem..." -ForegroundColor Cyan
    & git commit -m "$Mensagem"
}

Write-Host "Enviando para o GitHub (git push origin main)..." -ForegroundColor Cyan
& git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBackend enviado com sucesso para https://github.com/rodriguescrisostomo2353-sketch/BACK-END-ABA!" -ForegroundColor Green
} else {
    Write-Host "`nFalha ao enviar. Verifique sua conexão e autenticação." -ForegroundColor Red
}
