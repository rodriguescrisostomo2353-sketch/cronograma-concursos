# ==============================================================================
# Script de Envio Automático para o Repositório Remoto (Git Push)
# ==============================================================================
param (
    [string]$Mensagem = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         ENVIO AUTOMÁTICO DO PROJETO (GIT PUSH)           " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Garantir que o Git esteja no PATH da sessão
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\Git\cmd\git.exe") {
        $env:Path = "C:\Program Files\Git\cmd;" + $env:Path
    } else {
        Write-Host "❌ Erro: O Git não foi encontrado no sistema!" -ForegroundColor Red
        Write-Host "Por favor, instale o Git ou reinicie o terminal." -ForegroundColor Yellow
        exit 1
    }
}

$root = $PSScriptRoot
Set-Location $root

# 2. Verificar se a pasta já é um repositório Git
$isRepo = Test-Path (Join-Path $root ".git")
if (-not $isRepo) {
    Write-Host "⚠️ Este projeto ainda não é um repositório Git inicializado." -ForegroundColor Yellow
    Write-Host "Inicializando repositório agora..." -ForegroundColor Cyan
    & git init
    & git branch -M main

    Write-Host "`nPara enviar seus arquivos para o GitHub, você precisa conectar a um repositório remoto." -ForegroundColor Yellow
    $remoteUrl = Read-Host "Cole aqui a URL do seu repositório no GitHub (ex: https://github.com/SEU_USUARIO/SEU_REPO.git)"
    
    if (-not [string]::IsNullOrWhiteSpace($remoteUrl)) {
        & git remote add origin $remoteUrl.Trim()
        Write-Host "✅ Repositório remoto 'origin' configurado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Nenhuma URL de repositório informada." -ForegroundColor Red
        Write-Host "Quando criar seu repositório no GitHub, conecte-o rodando:" -ForegroundColor Yellow
        Write-Host "  git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git" -ForegroundColor Cyan
        Write-Host "E depois execute este script novamente." -ForegroundColor Yellow
        exit 1
    }
}

# 3. Verificar se há repositório remoto configurado
$remotes = & git remote -v
if (-not $remotes) {
    Write-Host "⚠️ Nenhum repositório remoto configurado." -ForegroundColor Yellow
    $remoteUrl = Read-Host "Cole aqui a URL do seu repositório no GitHub (ex: https://github.com/SEU_USUARIO/SEU_REPO.git)"
    if (-not [string]::IsNullOrWhiteSpace($remoteUrl)) {
        & git remote add origin $remoteUrl.Trim()
        Write-Host "✅ Remoto configurado!" -ForegroundColor Green
    } else {
        Write-Host "❌ Não é possível enviar sem um repositório remoto configurado." -ForegroundColor Red
        exit 1
    }
}

# 4. Exibir status dos arquivos alterados
Write-Host "🔍 Verificando alterações no projeto (git status)..." -ForegroundColor Cyan
& git status -s

$statusOutput = & git status --porcelain
$unpushed = & git log origin/main..HEAD 2>$null

if ([string]::IsNullOrWhiteSpace($statusOutput) -and [string]::IsNullOrWhiteSpace($unpushed)) {
    Write-Host "`n✨ Nenhuma alteração pendente para enviar. Seu repositório já está 100% atualizado!" -ForegroundColor Green
    exit 0
}

# 5. Definir mensagem do commit
if ([string]::IsNullOrWhiteSpace($Mensagem)) {
    Write-Host ""
    $inputMsg = Read-Host "Digite a mensagem do commit (ou aperte ENTER para usar mensagem automática)"
    if ([string]::IsNullOrWhiteSpace($inputMsg)) {
        $dataHora = (Get-Date).ToString("yyyy-MM-dd HH:mm")
        $Mensagem = "Atualização do projeto ($dataHora)"
    } else {
        $Mensagem = $inputMsg.Trim()
    }
}

# 6. Adicionar arquivos e fazer commit
Write-Host "`n📦 Adicionando arquivos (git add .)..." -ForegroundColor Cyan
& git add .

$staged = & git status --porcelain
if (-not [string]::IsNullOrWhiteSpace($staged)) {
    Write-Host "📝 Criando commit: `"$Mensagem`"..." -ForegroundColor Cyan
    & git commit -m "$Mensagem"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha ao criar o commit." -ForegroundColor Red
        exit 1
    }
}

# 7. Obter branch atual e enviar (git push)
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
    $branch = "main"
}

Write-Host "`n🚀 Enviando alterações para o GitHub (git push origin $branch)..." -ForegroundColor Cyan
$pushOutput = & git push -u origin $branch 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "       ENVIO CONCLUÍDO COM SUCESSO PARA O GITHUB!         " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Suas alterações já estão sincronizadas no repositório remoto.`n" -ForegroundColor Green
} else {
    Write-Host "`n❌ Ocorreu um problema ao enviar (git push):" -ForegroundColor Red
    Write-Host ($pushOutput | Out-String) -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Dicas para resolver:" -ForegroundColor Cyan
    Write-Host "1. Se for o primeiro envio com autenticação, faça login na janela do navegador que o Git abrir." -ForegroundColor White
    Write-Host "2. Se o GitHub rejeitou porque o repositório remoto tem arquivos que você não tem (como README), rode:" -ForegroundColor White
    Write-Host "   git pull origin $branch --rebase" -ForegroundColor Yellow
    Write-Host "   E depois tente enviar novamente." -ForegroundColor White
    exit 1
}
