-- ================================================
-- PARTE 1: ENUMS
-- ================================================

-- Enum para tipos de roles
CREATE TYPE public.app_role AS ENUM (
  'user',
  'admin',
  'super_admin'
);

-- Enum para tipos de planos
CREATE TYPE public.plan_type AS ENUM (
  'survival',      -- 2 contas
  'professional',  -- 10 contas
  'agency',        -- 50 contas
  'enterprise'     -- Ilimitado
);

-- Enum para status de planos
CREATE TYPE public.plan_status AS ENUM (
  'active',
  'expired',
  'cancelled',
  'suspended'
);

-- Enum para providers de integração
CREATE TYPE public.integration_provider AS ENUM (
  'meta',
  'google'
);

-- Enum para status de integração
CREATE TYPE public.integration_status AS ENUM (
  'active',
  'expired',
  'error',
  'disconnected'
);

-- ================================================
-- PARTE 2: TABELAS
-- ================================================

-- Tabela de roles de usuário (CRITICAL: tabela separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Tabela de planos de usuário
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL DEFAULT 'survival',
  max_accounts INTEGER NOT NULL DEFAULT 2,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status plan_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de integrações (Meta Ads e Google Ads)
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  status integration_status NOT NULL DEFAULT 'active',
  integration_source TEXT DEFAULT 'oauth_manual', -- 'social_login' | 'oauth_manual'
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Tabela de contas de anúncios
CREATE TABLE public.ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL, -- ID da conta no provider (act_123456 para Meta, 123-456-7890 para Google)
  account_name TEXT NOT NULL,
  provider integration_provider NOT NULL,
  currency TEXT DEFAULT 'BRL',
  timezone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(integration_id, account_id)
);

-- Tabela de campanhas
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL, -- ID da campanha no provider
  name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'ACTIVE', 'PAUSED', 'DELETED', etc.
  objective TEXT,
  budget NUMERIC,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ad_account_id, campaign_id)
);

-- Tabela de métricas
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Métricas básicas
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr NUMERIC,
  cpc NUMERIC,
  
  -- Métricas avançadas
  link_clicks INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  initiated_checkout INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  
  -- Métricas de vídeo
  video_views_25 INTEGER DEFAULT 0,
  video_views_50 INTEGER DEFAULT 0,
  video_views_75 INTEGER DEFAULT 0,
  video_views_100 INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(campaign_id, date)
);

-- Tabela de alertas de campanha
CREATE TABLE public.campaign_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'budget_exceeded',
  threshold_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de logs de sincronização
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success' | 'error' | 'partial'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  accounts_synced INTEGER DEFAULT 0,
  campaigns_synced INTEGER DEFAULT 0,
  metrics_synced INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- PARTE 3: ÍNDICES
-- ================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX idx_ad_accounts_integration_id ON public.ad_accounts(integration_id);
CREATE INDEX idx_campaigns_ad_account_id ON public.campaigns(ad_account_id);
CREATE INDEX idx_metrics_campaign_id ON public.metrics(campaign_id);
CREATE INDEX idx_metrics_date ON public.metrics(date);
CREATE INDEX idx_campaign_alerts_campaign_id ON public.campaign_alerts(campaign_id);
CREATE INDEX idx_sync_logs_integration_id ON public.sync_logs(integration_id);

-- ================================================
-- PARTE 4: FUNÇÕES
-- ================================================

-- Função para verificar se usuário tem role específico (SECURITY DEFINER para evitar recursão de RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para obter informações do plano do usuário
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS TABLE(
  plan_type plan_type,
  max_accounts INTEGER,
  accounts_used BIGINT,
  can_add_account BOOLEAN,
  is_at_limit BOOLEAN,
  expires_at TIMESTAMPTZ,
  status plan_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.plan_type,
    up.max_accounts,
    COUNT(DISTINCT aa.id) AS accounts_used,
    (COUNT(DISTINCT aa.id) < up.max_accounts) AS can_add_account,
    (COUNT(DISTINCT aa.id) >= up.max_accounts) AS is_at_limit,
    up.expires_at,
    up.status
  FROM public.user_plans up
  LEFT JOIN public.integrations i ON i.user_id = up.user_id
  LEFT JOIN public.ad_accounts aa ON aa.integration_id = i.id
  WHERE up.user_id = p_user_id AND up.status = 'active'
  GROUP BY up.id;
END;
$$;

-- Função para obter métricas detalhadas
CREATE OR REPLACE FUNCTION public.get_detailed_metrics(
  p_user_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE(
  provider TEXT,
  total_impressions BIGINT,
  total_clicks BIGINT,
  total_spend NUMERIC,
  total_conversions INTEGER,
  total_link_clicks INTEGER,
  total_page_views INTEGER,
  total_initiated_checkout INTEGER,
  total_purchases INTEGER,
  total_video_views_25 INTEGER,
  total_video_views_50 INTEGER,
  total_video_views_75 INTEGER,
  total_video_views_100 INTEGER,
  avg_ctr NUMERIC,
  avg_cpc NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aa.provider::TEXT,
    COALESCE(SUM(m.impressions), 0)::BIGINT as total_impressions,
    COALESCE(SUM(m.clicks), 0)::BIGINT as total_clicks,
    COALESCE(SUM(m.spend), 0)::NUMERIC as total_spend,
    COALESCE(SUM(m.conversions), 0)::INTEGER as total_conversions,
    COALESCE(SUM(m.link_clicks), 0)::INTEGER as total_link_clicks,
    COALESCE(SUM(m.page_views), 0)::INTEGER as total_page_views,
    COALESCE(SUM(m.initiated_checkout), 0)::INTEGER as total_initiated_checkout,
    COALESCE(SUM(m.purchases), 0)::INTEGER as total_purchases,
    COALESCE(SUM(m.video_views_25), 0)::INTEGER as total_video_views_25,
    COALESCE(SUM(m.video_views_50), 0)::INTEGER as total_video_views_50,
    COALESCE(SUM(m.video_views_75), 0)::INTEGER as total_video_views_75,
    COALESCE(SUM(m.video_views_100), 0)::INTEGER as total_video_views_100,
    CASE 
      WHEN SUM(m.impressions) > 0 
      THEN ROUND((SUM(m.clicks)::NUMERIC / SUM(m.impressions)::NUMERIC * 100), 2)
      ELSE 0 
    END::NUMERIC as avg_ctr,
    CASE 
      WHEN SUM(m.clicks) > 0 
      THEN ROUND((SUM(m.spend)::NUMERIC / SUM(m.clicks)::NUMERIC), 2)
      ELSE 0 
    END::NUMERIC as avg_cpc
  FROM public.campaigns c
  JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
  JOIN public.integrations i ON i.id = aa.integration_id
  LEFT JOIN public.metrics m ON m.campaign_id = c.id 
    AND m.date >= p_date_from 
    AND m.date <= p_date_to
  WHERE i.user_id = p_user_id
  GROUP BY aa.provider;
END;
$$;