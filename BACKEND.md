# ☁️ GUIA COMPLETO DO BACK-END NA NUVEM (SUPABASE)

> **Projeto:** Cronograma de Estudos para Concursos (Web PWA + Android APK)  
> **Serviço de Nuvem:** Supabase (PostgreSQL Relacional + GoTrue Authentication + Storage S3-compatible)  
> **Instância Ativa:** `https://arhhajxkmjpjwbrlcsqm.supabase.co`  
> **Última Atualização:** 15/10/2026

---

## 📌 1. Por que Supabase?

O projeto já possuía integração com o **Supabase**. Dentre as vantagens para o nosso ecossistema:
1. **Banco PostgreSQL Relacional com JSONB:** Permite armazenar entidades estruturadas (usuários, matérias, cronogramas, logs de estudo) com consultas indexadas e constraints nativas.
2. **Row Level Security (RLS) Nativo:** Regras de segurança a nível de linha no próprio banco, garantindo que um usuário **NUNCA** consiga ler ou alterar dados de outro usuário.
3. **Plano Gratuito Generoso:**
   - **Autenticação:** Até 50.000 Usuários Ativos Mensais (MAU) gratuitos.
   - **Banco de Dados:** 500 MB de armazenamento incluído sem custo.
   - **Armazenamento de Arquivos:** 1 GB de storage e 2 GB de download mensal grátis.
   - **Sem exigência de cartão de crédito** para criação de projeto.

---

## 🗄️ 2. Modelo de Dados e Esquema SQL (DDL)

Caso você deseje recriar ou inicializar um novo projeto do Supabase do zero, execute o seguinte script no **SQL Editor** do painel do Supabase:

```sql
-- =============================================================================
-- ESQUEMA COMPLETO: BANCO DE DADOS CRONOGRAMA DE ESTUDOS
-- =============================================================================

-- 1. Habilita extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela Principal de Dados do Usuário
CREATE TABLE IF NOT EXISTS public.user_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    materias JSONB DEFAULT '[]'::jsonb NOT NULL,
    nao_classificado JSONB DEFAULT '[]'::jsonb NOT NULL,
    schedules JSONB DEFAULT '[]'::jsonb NOT NULL,
    active_schedule_id TEXT,
    completed_slots JSONB DEFAULT '{}'::jsonb NOT NULL,
    priorities JSONB DEFAULT '{}'::jsonb NOT NULL,
    auto_config JSONB DEFAULT '{}'::jsonb NOT NULL,
    exam_date TEXT,
    exam_title TEXT,
    spaced_reviews JSONB DEFAULT '[]'::jsonb NOT NULL,
    study_log JSONB DEFAULT '[]'::jsonb NOT NULL,
    theme TEXT DEFAULT 'light' NOT NULL,
    pdf_annotations JSONB DEFAULT '[]'::jsonb NOT NULL,
    pdf_bookmarks JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Índices para Otimização de Leitura e Economia de Cota
CREATE INDEX IF NOT EXISTS idx_user_data_updated_at ON public.user_data (updated_at DESC);

-- 4. Gatilho para Atualizar Automaticamente o Campo updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_data_updated_at ON public.user_data;
CREATE TRIGGER trigger_user_data_updated_at
    BEFORE UPDATE ON public.user_data
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
```

---

## 🛡️ 3. Regras de Segurança (Row Level Security - RLS)

As regras abaixo garantem isolamento total: **cada usuário autenticado lê, insere, atualiza e exclui APENAS o seu próprio registro**. Todas as requisições anônimas ou de outros usuários são negadas pelo banco.

```sql
-- Habilita RLS na tabela
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 1. Regra de Leitura (SELECT): Apenas o próprio usuário autenticado
CREATE POLICY "Permitir leitura apenas pelo dono"
ON public.user_data
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Regra de Inserção (INSERT): Apenas com seu próprio UID
CREATE POLICY "Permitir inserção apenas pelo dono"
ON public.user_data
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Regra de Atualização (UPDATE): Apenas seus próprios dados
CREATE POLICY "Permitir atualização apenas pelo dono"
ON public.user_data
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Regra de Exclusão (DELETE): Apenas seus próprios dados (LGPD)
CREATE POLICY "Permitir exclusão apenas pelo dono"
ON public.user_data
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

---

## 📁 4. Armazenamento de Arquivos (Storage)

### 📊 Limites e Custos do Plano Gratuito:
- **Espaço Gratuito:** 1 GB incluído.
- **Tamanho Máximo por Arquivo:** 50 MB (recomendado limitar no app para 25 MB).
- **Tráfego de Saída (Egress):** 2 GB/mês.
- **Custo:** R$ 0,00 (100% gratuito).

> [!TIP]
> **Estratégia Híbrida Adotada:** O aplicativo salva arquivos e PDFs prioritariamente no **IndexedDB local** do aparelho. Isso garante acesso 100% offline, abertura instantânea sem consumo de franquia 4G/5G, e reserva a nuvem apenas para metadados e sincronização de anotações.

### DDL para Criação do Bucket de Arquivos (Opcional):
```sql
-- Cria o bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'arquivos_usuario',
    'arquivos_usuario',
    false,
    26214400, -- Limite de 25MB por arquivo
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Regras de Segurança no Storage: apenas o dono acessa arquivos/{uid}/*
CREATE POLICY "Acesso a arquivos restrito ao dono"
ON storage.objects
FOR ALL
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🔒 5. Separação de Ambientes e Segurança das Chaves

- **Chaves no Frontend:** O arquivo `index.html` contém **APENAS** a chave anônima pública de cliente (`anonKey`). Essa chave foi desenhada pelo Supabase para ficar pública no navegador/app e opera sob as restrições estritas do **RLS**.
- **Chave Secreta (`service_role`):** **NUNCA** inclua a chave de serviço (`service_role`) no código-fonte, repositório Git ou APK. Ela possui poderes de administrador irrestritos que ignoram o RLS.

### Como Trocar de Ambiente (Dev / Produção):
No arquivo [index.html](file:///c:/Users/Thallisson/Desktop/projeto%20aba/index.html#L9778):
```javascript
const SUPABASE_CONFIG = {
  url: 'https://seu-projeto.supabase.co',
  anonKey: 'sua-chave-anon-publica'
};
```

---

## 🧪 6. Como Executar os Testes de Regras de Segurança

Para rodar a bateria de testes automatizados de segurança do backend:
```bash
node scratch/test_backend_rules.js
```
Saída esperada:
```
========================================================================
  BATERIA DE TESTES DE SEGURANÇA E REGRAS DO BACKEND NA NUVEM
========================================================================
  ✅ [PASS] 1. Conexão ao endpoint REST bem-sucedida (Status 200)
  ✅ [PASS] 2. Tentativa de escrita sem usuário autenticado bloqueada pelo RLS (Status 401)
  ✅ [PASS] 3. Acesso à tabela interna de usuários bloqueado com chave pública (Status 404)
  ✅ [PASS] 4. Sistema de autenticação (cadastro/login) ativo e aceitando requisições
  ✅ [PASS] 5. Tentativa de login indevido rejeitada com segurança (Status 422)
========================================================================
  RESULTADO: 5 de 5 TESTES DE REGRAS DE SEGURANÇA APROVADOS
========================================================================
```

---

## 👤 7. Passo a Passo: Caso Queira Criar uma Nova Conta/Projeto Próprio

Se você preferir criar um novo projeto exclusivo no seu próprio email:

1. Acesse [supabase.com](https://supabase.com) e clique em **Start your project**.
2. Faça login com sua conta do GitHub ou Google (gratuito).
3. Clique em **New Project**:
   - **Name:** `cronograma-concursos`
   - **Database Password:** Escolha uma senha forte e anote em local seguro.
   - **Region:** Escolha `São Paulo (sa-east-1)` para menor latência no Brasil.
   - **Pricing Plan:** Free.
4. Clique em **Create new project** e aguarde ~2 minutos.
5. No menu lateral esquerdo, clique em **SQL Editor** > **New Query**, cole todo o código SQL da **Seção 2 e 3** deste documento e clique em **Run**.
6. Vá em **Project Settings** (ícone de engrenagem) > **API**:
   - Copie a **Project URL**.
   - Copie a chave **anon public**.
7. Cole esses dois valores em `index.html` em `const SUPABASE_CONFIG`.

---

## 🛡️ 8. Arquitetura Anti-Duplicação e Integridade de Sincronização

A partir da versão 1.8.0, o aplicativo adota um sistema anti-duplicação à prova de falhas com proteção em 6 camadas:

1. **Identificadores Estáveis e Determinísticos (`IdUtils`):**
   - Itens de edital (matérias e tópicos) recebem identificadores calculados por hashing determinístico de seu conteúdo (`cyrb53` / `FNV-1a 64-bit`).
   - Reprocessar o mesmo edital gera exatamente os mesmos IDs, impedindo a proliferação de registros órfãos.
2. **Outbox Idempotente e Compactação de Fila Offline:**
   - Cada mutação gravada offline recebe um `opId` imutável.
   - Mutações redundantes sobre a mesma entidade são compactadas em tempo polinomial antes do envio.
3. **Anti-Eco e Detecção de Ciclo:**
   - Cada payload inclui `device_id`, `revision` incremental e `content_hash`.
   - O aplicativo descarta imediatamente payloads que sejam reflexo de suas próprias gravações locais.
4. **Mesclagem Canônica por Chave Lógica (Complexidade $O(N)$):**
   - A mesclagem utiliza índices `Map` em memória (`topicById`, `topicByKey`, `topicByText`), garantindo unificação sem duplicação de tópicos em menos de 150ms mesmo para 20.000+ tópicos.
5. **Disjuntor de Segurança (Circuit Breaker):**
   - Monitora variações volumétricas anômalas. Caso uma mesclagem tente aumentar o volume de tópicos em mais de 20% e mais de 500 itens simultaneamente, a sincronização é pausada preventivamente e um diagnóstico é registrado.
6. **Suíte Automatizada de Provas:**
   - O arquivo `test_antiduplication_suite.js` valida os 8 cenários de integridade de dados e o teste de estresse com 20.000 tópicos:
     ```bash
     node test_antiduplication_suite.js
     ```

---

## ⚡ 9. Controle Geracional por `reset_epoch` e Limpeza Segura

Para permitir que a base de dados na nuvem seja reiniciada de forma limpa sem que clientes offline ressuscitem dados antigos ("zombie data resurrection"), o sistema utiliza o **Controle Geracional por `reset_epoch`**:

1. **O que é o `reset_epoch`:**
   - É um número de geração (timestamp Unix em milissegundos) registrado tanto na nuvem (`user_data.reset_epoch`) quanto no cliente (`concurso_reset_epoch`).
2. **Detecção e Backup Local Mandatório:**
   - Sempre que o cliente detecta que o `reset_epoch` da nuvem é superior ao seu epoch local, ele **executa imediatamente um backup de segurança local** (`concurso_pre_reset_backup`) antes de qualquer alteração.
3. **Purga da Fila Outbox:**
   - Todas as mutações locais geradas sob a geração anterior são sumariamente descartadas da fila outbox, impedindo o reenvio de dados antigos.
4. **Reinicialização Limpa:**
   - Os dados locais são redefinidos e o novo epoch é gravado, sincronizando perfeitamente com a nova geração limpa.

---

## 🛠️ 10. Manual Operacional: Ferramenta de Reset (`tools/admin/reset-dados.js`)

A pasta `tools/admin/` disponibiliza o utilitário seguro de linha de comando para administração e contingência de dados.

### 🔑 Como Obter a Chave Administrativa (`service_role`)
> [!CAUTION]
> A chave `service_role` possui acesso irrestrito ao banco e ignora o RLS. **NUNCA** a insira no código-fonte, commits do Git ou arquivos públicos.

1. Acesse o painel do Supabase: [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione o projeto `arhhajxkmjpjwbrlcsqm` > **Project Settings** (ícone de engrenagem) > **API**.
3. Na seção **Project API keys**, copie o valor do campo **`service_role` (secret)**.
4. No terminal, defina a variável de ambiente (apenas na sessão atual):
   - **PowerShell (Windows):**
     ```powershell
     $env:ADMIN_RESET_SECRET="sua-chave-service-role-aqui"
     ```
   - **Bash / Linux / macOS:**
     ```bash
     export ADMIN_RESET_SECRET="sua-chave-service-role-aqui"
     ```

---

### 📋 Passo 1: Executar Simulação Prévia (Dry-Run)
A simulação lista todos os usuários, matérias, tópicos e logs sem fazer nenhuma alteração no banco:
```bash
node tools/admin/reset-dados.js --simulacao
```

### 💾 Passo 2: Exportar Backup Completo de Contingência
Gera uma cópia fiel em arquivo JSON de todos os registros da tabela `user_data` de todos os usuários:
```bash
node tools/admin/reset-dados.js --exportar ./backup_nuvem_pre_reset.json
```

### 🚨 Passo 3: Execução de Reset Confirmado na Nuvem
> [!WARNING]
> Esta operação incrementará o `reset_epoch` e reiniciará matérias, cronogramas e logs de todos os usuários na nuvem. Um backup pré-reset mandatório é salvo automaticamente em disco antes da limpeza.

```bash
node tools/admin/reset-dados.js --executar-reset-confirmado --confirmar-destruicao-irreversivel
```

---

### 🔄 Procedimento de Contingência e Rollback
Se por qualquer motivo for necessário restaurar os dados anteriores ao reset:
1. Localize o arquivo gerado no Passo 2 (`backup_nuvem_pre_reset.json`) ou o backup mandatório gerado automaticamente (`backup_mandatorio_pre_reset_<epoch>.json`).
2. O arquivo contém a lista completa de usuários com todas as suas matérias, cronogramas e logs originais.
3. Para restaurar um usuário individual via Supabase SQL Editor:
   ```sql
   UPDATE public.user_data
   SET materias = '<JSON_MATERIAS>'::jsonb,
       schedules = '<JSON_SCHEDULES>'::jsonb,
       study_log = '<JSON_STUDY_LOG>'::jsonb,
       updated_at = NOW()
   WHERE user_id = '<ID_DO_USUARIO>';
   ```
4. Nos aparelhos dos usuários, o backup local pré-reset também fica salvo no navegador sob a chave `concurso_pre_reset_backup` e pode ser inspecionado ou restaurado pela aba **Ajustes > Restaurar Backup**.
