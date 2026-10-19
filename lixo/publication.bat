@echo off
chcp 65001 >nul
title Publicar Projeto - Cronograma de Estudos
color 0B

echo ==========================================================
echo        PUBLICACAO AUTOMATICA DO PROJETO NO GITHUB
echo ==========================================================
echo.

:: 1. Garantir que o Git esta no PATH da sessao
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "PATH=C:\Program Files\Git\cmd;%PATH%"
    ) else (
        color 0C
        echo [ERRO] O Git nao foi encontrado no sistema!
        echo Por favor, instale o Git ou verifique se esta configurado.
        echo.
        pause
        exit /b 1
    )
)

:: 2. Garantir que esta na pasta correta do projeto
cd /d "%~dp0"

echo [1/3] Verificando alteracoes no projeto...
git status --short
echo.

:: 3. Adicionar arquivos modificados
echo [2/3] Preparando arquivos modificados...
git add .

:: Verifica se ha novos commits a serem criados
git diff --cached --quiet
if %errorlevel% neq 0 (
    set "HORA=%time:~0,5%"
    if "%HORA:~0,1%"==" " set "HORA=0%HORA:~1,4%"
    echo Criando commit com as alteracoes recentes...
    git commit -m "Publicacao do projeto (%date% as %HORA%)"
    echo.
) else (
    echo Nenhum arquivo pendente de commit. Verificando envios pendentes...
    echo.
)

:: 4. Identificar a branch atual (geralmente main)
set "BRANCH=main"
for /f "tokens=*" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "BRANCH=%%b"

:: 5. Enviar para o GitHub
echo [3/3] Enviando alteracoes para o GitHub (git push origin %BRANCH%)...
echo.
git push -u origin %BRANCH%

if %errorlevel% equ 0 (
    color 0A
    echo.
    echo ==========================================================
    echo         PROJETO PUBLICADO COM SUCESSO NO GITHUB!
    echo ==========================================================
    echo Branch: %BRANCH%
    echo Repositorio atualizado e sincronizado na nuvem.
    echo ==========================================================
) else (
    color 0C
    echo.
    echo ==========================================================
    echo            ATENCAO: O ENVIO NAO FOI CONCLUIDO
    echo ==========================================================
    echo O GitHub pode ter solicitado autenticacao.
    echo Se abriu uma janela do navegador, faca o login/autorizacao
    echo e execute o arquivo novamente.
    echo ==========================================================
)

echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
