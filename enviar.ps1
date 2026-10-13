# ==============================================================================
# Script de Envio Automatico para o Repositorio Remoto (Git Push)
# ==============================================================================
param (
    [string]$Mensagem = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         ENVIO AUTOMATICO DO PROJETO (GIT PUSH)           " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Garantir que o Git esteja no PATH da sessao
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\Git\cmd\git.exe") {
        $env:Path = "C:\Program Files\Git\cmd;" + $env:Path
    } else {
        Write-Host "Erro: O Git nao foi encontrado no sistema!" -ForegroundColor Red
        Write-Host "Por favor, instale o Git ou reinicie o terminal." -ForegroundColor Yellow
        exit 1
    }
}

$root = $PSScriptRoot
Set-Location $root

# 2. Verificar se a pasta ja e um repositorio Git
$isRepo = Test-Path (Join-Path $root ".git")
if (-not $isRepo) {
    Write-Host "Este projeto ainda nao e um repositorio Git inicializado." -ForegroundColor Yellow
    Write-Host "Inicializando repositorio agora..." -ForegroundColor Cyan
    & git init
    & git branch -M main

    Write-Host "`nPara enviar seus arquivos para o GitHub, voce precisa conectar a um repositorio remoto." -ForegroundColor Yellow
    $remoteUrl = Read-Host "Cole aqui a URL do seu repositorio no GitHub (ex: https://github.com/SEU_USUARIO/SEU_REPO.git)"
    
    if (-not [string]::IsNullOrWhiteSpace($remoteUrl)) {
        & git remote add origin $remoteUrl.Trim()
        Write-Host "Repositorio remoto 'origin' configurado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "`nNenhuma URL de repositorio informada." -ForegroundColor Red
        exit 1
    }
}

# 3. Verificar se ha repositorio remoto configurado
$remotes = & git remote -v
if (-not $remotes) {
    Write-Host "Nenhum repositorio remoto configurado." -ForegroundColor Yellow
    $remoteUrl = Read-Host "Cole aqui a URL do seu repositorio no GitHub (ex: https://github.com/SEU_USUARIO/SEU_REPO.git)"
    if (-not [string]::IsNullOrWhiteSpace($remoteUrl)) {
        & git remote add origin $remoteUrl.Trim()
        Write-Host "Remoto configurado!" -ForegroundColor Green
    } else {
        Write-Host "Nao e possivel enviar sem um repositorio remoto configurado." -ForegroundColor Red
        exit 1
    }
}

# 4. Exibir status dos arquivos alterados
Write-Host "Verificando alteracoes no projeto (git status)..." -ForegroundColor Cyan
& git status -s

$statusOutput = & git status --porcelain
$unpushed = & git log origin/main..HEAD 2>$null

if ([string]::IsNullOrWhiteSpace($statusOutput) -and [string]::IsNullOrWhiteSpace($unpushed)) {
    Write-Host "`nNenhuma alteracao pendente para enviar. Seu repositorio ja esta 100% atualizado!" -ForegroundColor Green
    exit 0
}

# 5. Definir mensagem do commit se houver alteracoes no index
if (-not [string]::IsNullOrWhiteSpace($statusOutput)) {
    if ([string]::IsNullOrWhiteSpace($Mensagem)) {
        Write-Host ""
        $inputMsg = Read-Host "Digite a mensagem do commit (ou aperte ENTER para usar mensagem automatica)"
        if ([string]::IsNullOrWhiteSpace($inputMsg)) {
            $dataHora = (Get-Date).ToString("yyyy-MM-dd HH:mm")
            $Mensagem = "Atualizacao do projeto ($dataHora)"
        } else {
            $Mensagem = $inputMsg.Trim()
        }
    }

    Write-Host "`nAdicionando arquivos (git add .)..." -ForegroundColor Cyan
    & git add .

    $staged = & git status --porcelain
    if (-not [string]::IsNullOrWhiteSpace($staged)) {
        Write-Host "Criando commit: $Mensagem..." -ForegroundColor Cyan
        & git commit -m "$Mensagem"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha ao criar o commit." -ForegroundColor Red
            exit 1
        }
    }
}

# 6. Obter branch atual e enviar (git push)
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
    $branch = "main"
}

Write-Host "`nEnviando alteracoes para o GitHub (git push origin $branch)..." -ForegroundColor Cyan
$pushOutput = & git push -u origin $branch 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "       ENVIO CONCLUIDO COM SUCESSO PARA O GITHUB!         " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Suas alteracoes ja estao sincronizadas no repositorio remoto.`n" -ForegroundColor Green
} else {
    Write-Host "`nOcorreu um problema ao enviar (git push):" -ForegroundColor Red
    Write-Host ($pushOutput | Out-String) -ForegroundColor Yellow
    Write-Host ""
    $gcm = "C:\Program Files\Git\mingw64\bin\git-credential-manager.exe"
    if (Test-Path $gcm) {
        Write-Host "Tentando abrir autenticacao no navegador..." -ForegroundColor Cyan
        & $gcm github login --web
        Write-Host "Tentando enviar novamente..." -ForegroundColor Cyan
        & git push -u origin $branch
    }
}
