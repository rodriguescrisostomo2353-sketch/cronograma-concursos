-- ==============================================================================
-- SCRIPT DE CORREÇÃO DEFINITIVA DE TABELAS E RLS NO SUPABASE
-- Projeto: Cronograma Tático / Student OS
-- Banco de Dados: PostgreSQL / Supabase
-- Executar em: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Criação / Atualização da tabela principal 'user_data'
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  materias JSONB DEFAULT '[]'::jsonb,
  nao_classificado JSONB DEFAULT '[]'::jsonb,
  schedules JSONB DEFAULT '[]'::jsonb,
  active_schedule_id TEXT,
  completed_slots JSONB DEFAULT '{}'::jsonb,
  priorities JSONB DEFAULT '{}'::jsonb,
  auto_config JSONB DEFAULT '{}'::jsonb,
  exam_date TEXT,
  exam_title TEXT,
  spaced_reviews JSONB DEFAULT '[]'::jsonb,
  theme TEXT DEFAULT 'dark',
  pdf_annotations JSONB DEFAULT '[]'::jsonb,
  pdf_bookmarks JSONB DEFAULT '[]'::jsonb,
  study_log JSONB DEFAULT '[]'::jsonb,
  reset_epoch INTEGER DEFAULT 0,
  device_id TEXT,
  revision INTEGER DEFAULT 1,
  content_hash TEXT,
  study_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Garantir que todas as colunas esperadas existam mesmo se a tabela já tiver sido criada antes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='exam_title') THEN
    ALTER TABLE public.user_data ADD COLUMN exam_title TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='spaced_reviews') THEN
    ALTER TABLE public.user_data ADD COLUMN spaced_reviews JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='theme') THEN
    ALTER TABLE public.user_data ADD COLUMN theme TEXT DEFAULT 'dark';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='pdf_annotations') THEN
    ALTER TABLE public.user_data ADD COLUMN pdf_annotations JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='pdf_bookmarks') THEN
    ALTER TABLE public.user_data ADD COLUMN pdf_bookmarks JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='study_log') THEN
    ALTER TABLE public.user_data ADD COLUMN study_log JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='reset_epoch') THEN
    ALTER TABLE public.user_data ADD COLUMN reset_epoch INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='device_id') THEN
    ALTER TABLE public.user_data ADD COLUMN device_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='revision') THEN
    ALTER TABLE public.user_data ADD COLUMN revision INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='content_hash') THEN
    ALTER TABLE public.user_data ADD COLUMN content_hash TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_data' AND column_name='study_data') THEN
    ALTER TABLE public.user_data ADD COLUMN study_data JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 3. Habilita Row Level Security (RLS) na tabela user_data
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 4. Remoção idempotente de políticas anteriores para evitar duplicações/conflitos
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios dados" ON public.user_data;
DROP POLICY IF EXISTS "Permitir leitura pelo proprietário" ON public.user_data;
DROP POLICY IF EXISTS "Permitir gravação pelo proprietário" ON public.user_data;
DROP POLICY IF EXISTS "Permitir select para proprietario" ON public.user_data;
DROP POLICY IF EXISTS "Permitir insert para proprietario" ON public.user_data;
DROP POLICY IF EXISTS "Permitir update para proprietario" ON public.user_data;
DROP POLICY IF EXISTS "Permitir delete para proprietario" ON public.user_data;

-- 5. Criação das políticas definitivas com permissão total para o dono autenticado
CREATE POLICY "Permitir select para proprietario"
ON public.user_data
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Permitir insert para proprietario"
ON public.user_data
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir update para proprietario"
ON public.user_data
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir delete para proprietario"
ON public.user_data
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. Garantir permissões de acesso aos roles da API do Supabase
GRANT ALL ON TABLE public.user_data TO authenticated;
GRANT ALL ON TABLE public.user_data TO service_role;
GRANT SELECT ON TABLE public.user_data TO anon;

-- Notificação de sucesso
SELECT 'Políticas RLS e tabela user_data configuradas com sucesso!' AS status;

