# 📋 AUDITORIA COMPLETA DO SISTEMA (VARREDURA TÉCNICA)

> **Data da Auditoria:** 15/10/2026  
> **Versão do Sistema Auditado:** v1.7.5  
> **Plataformas Cobertas:** Web (PWA / GitHub Pages) e Mobile Android (Capacitor APK)  
> **Responsável:** Antigravity AI Assistant & Engenharia de Software  

---

## 📊 Resumo Executivo dos Achados

| Severidade | Total de Achados | Corrigidos Automaticamente | Listados para Decisão/Etapa 2 |
| :--- | :---: | :---: | :---: |
| **CRÍTICO** | 1 | 1 | 0 |
| **ALTO** | 5 | 5 | 0 |
| **MÉDIO** | 3 | 0 | 3 (Planejados na Etapa 2) |
| **BAIXO** | 2 | 0 | 2 (Planejados na Etapa 2) |
| **TOTAL** | **11** | **6** | **5** |

---

## 🔍 Detalhamento dos Achados por Eixo

### 1. ERROS E BUGS

#### [ALTO] Achado 1.1: Datas Geradas com `toISOString()` (UTC) Quebram o Histórico Diário de Estudos
- **Arquivo / Linha:** [index.html](file:///c:/Users/Thallisson/Desktop/projeto%20aba/index.html#L20914) (linhas 20914, 21040, 21122), [study-hours-manager.js](file:///c:/Users/Thallisson/Desktop/projeto%20aba/study-hours-manager.js#L51).
- **Explicação em Linguagem Simples:** O método nativo `new Date().toISOString().split('T')[0]` gera a data baseada no fuso horário universal (UTC). No Brasil (fuso de Brasília, UTC-3), qualquer sessão de estudo, revisão ou tópico marcado após as **21:00** é gravado com a data de **AMANHÃ**. Isso distorce as estatísticas diárias e o gráfico semanal.
- **Como Corrigir:** Substituir o uso de `.toISOString().split('T')[0]` por `StudyHoursManager.getLocalDateString()` ou pela função utilitária local `getLocalDateString(d)`, que lê diretamente o ano, mês e dia no relógio local do usuário.
- **Status:** **CORREÇÃO APLICADA (ALTO)**.

---

### 2. DADOS E PERSISTÊNCIA

#### [CRÍTICO] Achado 2.1: Inconsistência de Tópicos (String vs Objeto) Causa Falha Silenciosa ao Marcar Concluído
- **Arquivo / Linha:** [index.html](file:///c:/Users/Thallisson/Desktop/projeto%20aba/index.html#L8794) (linhas 8794, 11651, 12421-12431), [study-hours-manager.js](file:///c:/Users/Thallisson/Desktop/projeto%20aba/study-hours-manager.js#L550).
- **Explicação em Linguagem Simples:** Quando matérias são importadas por edital ou pelo exemplo padrão (`DEMO_DATA`), a lista de tópicos pode conter textos simples (strings como `"1. Compreensão de texto"`). Ao clicar para marcar o tópico como concluído, a função tentava fazer `topic.concluido = true`. No JavaScript, definir propriedades em strings primitivas falha silenciosamente sem dar erro, impedindo que o tópico seja marcado ou salvo.
- **Como Corrigir:** Na normalização de dados (`normalizarMaterias`), converter obrigatoriamente qualquer tópico string em objeto padrão `{ id: '...', texto: '...', concluido: false }`. No método `toggleTopic`, assegurar que `typeof topic === 'string'` seja convertido antes da alteração.
- **Status:** **CORREÇÃO APLICADA (CRÍTICO)**.

#### [ALTO] Achado 2.2: Falta de Controle de Versão do Esquema de Dados (`dataVersion`)
- **Arquivo / Linha:** [index.html](file:///c:/Users/Thallisson/Desktop/projeto%20aba/index.html#L13680-L13710).
- **Explicação em Linguagem Simples:** O banco local no `localStorage` gravava os dados sem um identificador de versão do esquema (`dataVersion`). O app dependia de verificações pontuais (ex.: `concurso_v162_divisor_migrated`), com risco de repetir migrações ou quebrar a leitura se novos campos forem adicionados.
- **Como Corrigir:** Incluir o campo `dataVersion: 1` no envelope de dados do aplicativo e criar um manipulador central de migrações que só executa uma vez quando `dataVersion < VERSAO_ATUAL`.
- **Status:** **CORREÇÃO APLICADA (ALTO)**.

---

### 3. SEGURANÇA

#### [ALTO] Achado 3.1: Links Externos com `target="_blank"` sem `rel="noopener noreferrer"`
- **Arquivo / Linha:** [index.html](file:///c:/Users/Thallisson/Desktop/projeto%20aba/index.html#L6517) (linhas 6517 e 6524).
- **Explicação em Linguagem Simples:** Links que abrem uma nova aba no navegador sem os atributos `rel="noopener noreferrer"` sofrem da vulnerabilidade conhecida como *Reverse Tabnabbing*. A nova página aberta obtém acesso ao objeto `window.opener` e pode redirecionar a aba original para um endereço malicioso sem que o usuário perceba.
- **Como Corrigir:** Adicionar explicitamente `rel="noopener noreferrer"` nas tags `<a>` dos botões de download e do GitHub Releases.
- **Status:** **CORREÇÃO APLICADA (ALTO)**.

#### [ALTO] Achado 3.2: Risco de Extração de Dados via USB Debugging (`android:allowBackup="true"`)
- **Arquivo / Linha:** [AndroidManifest.xml](file:///c:/Users/Thallisson/Desktop/projeto%20aba/android/app/src/main/AndroidManifest.xml#L5).
- **Explicação em Linguagem Simples:** Com `android:allowBackup="true"`, qualquer pessoa com acesso físico ao smartphone conectado a um computador com depuração USB habilitada pode executar o comando `adb backup` e extrair todas as sessões, tokens e arquivos do app sem digitar senha.
- **Como Corrigir:** Definir `android:allowBackup="false"` no manifesto do Android.
- **Status:** **CORREÇÃO APLICADA (ALTO)**.

#### [MÉDIO] Achado 3.3: Carregamento de SDK de CDN com Versão Flutuante (`@supabase/supabase-js@2`)
- **Arquivo / Linha:** [index.html](file:///c:/Users/Thallisson/Desktop/projeto%20aba/index.html#L9708).
- **Explicação em Linguagem Simples:** O fallback do `LazyLoader` carrega `@supabase/supabase-js@2`. Versões flutuantes podem introduzir quebras ou alterações não testadas no futuro.
- **Como Corrigir:** Fixar a versão exata (ex.: `2.48.1`) e avaliar inserção de atributo `integrity` (SRI).
- **Status:** **LISTADO PARA ETAPA 2 (MÉDIO)**.

---

### 4. PERFORMANCE

#### [ALTO] Achado 4.1: Persistência Desnecessária de Múltiplos Arquivos de Backup no Repositório Git
- **Arquivo / Linha:** `.gitignore`, arquivos `index.html.bak` (830 KB), `index.html.before_library.bak` (877 KB) e `diff_index.patch` (152 KB).
- **Explicação em Linguagem Simples:** Mais de 1,8 MB de arquivos de backup anteriores e patches estavam sendo versionados no Git, tornando os comandos `git clone`, `git status` e downloads mais lentos.
- **Como Corrigir:** Adicionar extensões `*.bak`, `*.patch` e pastas temporárias `scratch/` no `.gitignore` e desvincular do repositório Git com `git rm --cached`.
- **Status:** **CORREÇÃO APLICADA (ALTO)**.

---

### 5. SERVICE WORKER E PWA

#### [BAIXO] Achado 5.1: Divergência de Nomenclatura nas Mensagens de Log do Service Worker
- **Arquivo / Linha:** [sw.js](file:///c:/Users/Thallisson/Desktop/projeto%20aba/sw.js#L27) (linhas 27 e 41).
- **Explicação em Linguagem Simples:** As mensagens de console do Service Worker imprimiam `[SW v23]` de forma estática, enquanto o cache ativo era `cronograma-concursos-v24`.
- **Como Corrigir:** Interpolar a constante `CACHE_NAME` dinamicamente nas mensagens de log.
- **Status:** **LISTADO PARA ETAPA 2 (BAIXO)**.

---

### 6. LAYOUT E ACESSIBILIDADE

#### [MÉDIO] Achado 6.1: Botões da Biblioteca Virtual com Área de Toque Inferior a 44px
- **Arquivo / Linha:** [index.html](file:///c:/Users/Thallisson/Desktop/projeto%20aba/index.html#L5518).
- **Explicação em Linguagem Simples:** Os botões de editar e excluir dos cards de arquivos foram dimensionados em 32x32px. Diretrizes de acessibilidade mobile (WCAG 2.5.5) recomendam alvos de toque de pelo menos 44x44px para evitar toques acidentais em telas pequenas.
- **Como Corrigir:** Ajustar o CSS para garantir área clicável mínima de 44x44px.
- **Status:** **LISTADO PARA ETAPA 2 (MÉDIO)**.

---

### 7. QUALIDADE DO CÓDIGO

#### [MÉDIO] Achado 7.1: Monolito de 22.400 Linhas no Arquivo Principal
- **Arquivo / Linha:** [index.html](file:///c:/Users/Thallisson/Desktop/projeto%20aba/index.html).
- **Explicação em Linguagem Simples:** O arquivo `index.html` centraliza toda a lógica de negócio, estilos CSS, componentes modais e banco de dados. Uma falha de sintaxe em uma área pode impactar todo o aplicativo.
- **Como Corrigir:** Reorganizar na Etapa 2 em módulos desacoplados com carregamento sob demanda (`src/core`, `src/data`, `src/sync`, `src/features`, `src/ui`, `src/styles`).
- **Status:** **PLANEJADO PARA ETAPA 2 (MÉDIO)**.

---

### 8. GIT E BUILD

#### [BAIXO] Achado 8.1: Configuração Depreciada no `capacitor.config.json`
- **Arquivo / Linha:** [capacitor.config.json](file:///c:/Users/Thallisson/Desktop/projeto%20aba/capacitor.config.json#L5).
- **Explicação em Linguagem Simples:** A chave `"bundledWebRuntime": false` foi descontinuada na versão 6 do Capacitor e gera um aviso no console de build.
- **Como Corrigir:** Remover a chave do arquivo de configuração.
- **Status:** **LISTADO PARA ETAPA 2 (BAIXO)**.

---

## 📌 Decisões que Exigem Aprovação do Usuário
- **Nenhuma decisão bloqueante de custo no momento:** O backend em nuvem utiliza o plano gratuito do Supabase (Autenticação + PostgreSQL com Row Level Security), compatível com limites generosos (até 50.000 usuários ativos e 500 MB de banco).
- Na **Etapa 3**, você receberá as instruções passo a passo para criar/conectar o projeto caso queira criar uma nova instância dedicada.
