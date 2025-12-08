-- ========================================
-- FASE 1: Adicionar coluna sync_enabled às campanhas
-- ========================================
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS sync_enabled boolean NOT NULL DEFAULT true;

-- ========================================
-- FASE 2: Limpar Ad Accounts duplicadas
-- ========================================
-- Primeiro, identificar e manter apenas a ad_account mais recente por (account_id, integration_id)
WITH ranked_accounts AS (
  SELECT id, account_id, integration_id,
    ROW_NUMBER() OVER (PARTITION BY account_id, integration_id ORDER BY created_at DESC) as rn
  FROM public.ad_accounts
),
accounts_to_keep AS (
  SELECT id FROM ranked_accounts WHERE rn = 1
),
accounts_to_delete AS (
  SELECT id FROM ranked_accounts WHERE rn > 1
)
-- Atualizar campanhas para apontar para a conta que será mantida
UPDATE public.campaigns c
SET ad_account_id = (
  SELECT ak.id FROM accounts_to_keep ak
  JOIN public.ad_accounts aa_kept ON ak.id = aa_kept.id
  JOIN public.ad_accounts aa_old ON aa_old.id = c.ad_account_id
  WHERE aa_kept.account_id = aa_old.account_id 
    AND aa_kept.integration_id = aa_old.integration_id
  LIMIT 1
)
WHERE c.ad_account_id IN (SELECT id FROM accounts_to_delete);

-- Deletar ad_accounts duplicadas (agora sem dependentes)
DELETE FROM public.ad_accounts
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY account_id, integration_id ORDER BY created_at DESC) as rn
    FROM public.ad_accounts
  ) ranked WHERE rn > 1
);

-- ========================================
-- FASE 3: Limpar Campanhas duplicadas
-- ========================================
-- Atualizar métricas para apontar para a campanha que será mantida
WITH ranked_campaigns AS (
  SELECT id, campaign_id, ad_account_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id, ad_account_id ORDER BY created_at DESC) as rn
  FROM public.campaigns
),
campaigns_to_keep AS (
  SELECT id, campaign_id, ad_account_id FROM ranked_campaigns WHERE rn = 1
),
campaigns_to_delete AS (
  SELECT id, campaign_id, ad_account_id FROM ranked_campaigns WHERE rn > 1
)
UPDATE public.metrics m
SET campaign_id = (
  SELECT ck.id FROM campaigns_to_keep ck
  JOIN public.campaigns c_old ON c_old.id = m.campaign_id
  WHERE ck.campaign_id = c_old.campaign_id 
    AND ck.ad_account_id = c_old.ad_account_id
  LIMIT 1
)
WHERE m.campaign_id IN (SELECT id FROM campaigns_to_delete);

-- Atualizar metric_breakdowns para apontar para a campanha que será mantida  
WITH ranked_campaigns AS (
  SELECT id, campaign_id, ad_account_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id, ad_account_id ORDER BY created_at DESC) as rn
  FROM public.campaigns
),
campaigns_to_keep AS (
  SELECT id, campaign_id, ad_account_id FROM ranked_campaigns WHERE rn = 1
),
campaigns_to_delete AS (
  SELECT id, campaign_id, ad_account_id FROM ranked_campaigns WHERE rn > 1
)
UPDATE public.metric_breakdowns mb
SET campaign_id = (
  SELECT ck.id FROM campaigns_to_keep ck
  JOIN public.campaigns c_old ON c_old.id = mb.campaign_id
  WHERE ck.campaign_id = c_old.campaign_id 
    AND ck.ad_account_id = c_old.ad_account_id
  LIMIT 1
)
WHERE mb.campaign_id IN (SELECT id FROM campaigns_to_delete);

-- Atualizar ad_sets para apontar para a campanha que será mantida
WITH ranked_campaigns AS (
  SELECT id, campaign_id, ad_account_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id, ad_account_id ORDER BY created_at DESC) as rn
  FROM public.campaigns
),
campaigns_to_keep AS (
  SELECT id, campaign_id, ad_account_id FROM ranked_campaigns WHERE rn = 1
),
campaigns_to_delete AS (
  SELECT id, campaign_id, ad_account_id FROM ranked_campaigns WHERE rn > 1
)
UPDATE public.ad_sets ads
SET campaign_id = (
  SELECT ck.id FROM campaigns_to_keep ck
  JOIN public.campaigns c_old ON c_old.id = ads.campaign_id
  WHERE ck.campaign_id = c_old.campaign_id 
    AND ck.ad_account_id = c_old.ad_account_id
  LIMIT 1
)
WHERE ads.campaign_id IN (SELECT id FROM campaigns_to_delete);

-- Atualizar campaign_alerts para apontar para a campanha que será mantida
WITH ranked_campaigns AS (
  SELECT id, campaign_id, ad_account_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id, ad_account_id ORDER BY created_at DESC) as rn
  FROM public.campaigns
),
campaigns_to_keep AS (
  SELECT id, campaign_id, ad_account_id FROM ranked_campaigns WHERE rn = 1
),
campaigns_to_delete AS (
  SELECT id, campaign_id, ad_account_id FROM ranked_campaigns WHERE rn > 1
)
UPDATE public.campaign_alerts ca
SET campaign_id = (
  SELECT ck.id FROM campaigns_to_keep ck
  JOIN public.campaigns c_old ON c_old.id = ca.campaign_id
  WHERE ck.campaign_id = c_old.campaign_id 
    AND ck.ad_account_id = c_old.ad_account_id
  LIMIT 1
)
WHERE ca.campaign_id IN (SELECT id FROM campaigns_to_delete);

-- Deletar campanhas duplicadas
DELETE FROM public.campaigns
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY campaign_id, ad_account_id ORDER BY created_at DESC) as rn
    FROM public.campaigns
  ) ranked WHERE rn > 1
);

-- ========================================
-- FASE 4: Adicionar constraints UNIQUE
-- ========================================
-- Unique constraint para ad_accounts (uma conta por integração)
ALTER TABLE public.ad_accounts 
DROP CONSTRAINT IF EXISTS ad_accounts_integration_account_unique;

ALTER TABLE public.ad_accounts 
ADD CONSTRAINT ad_accounts_integration_account_unique 
UNIQUE (integration_id, account_id);

-- Unique constraint para campaigns (uma campanha por conta)
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS campaigns_account_campaign_unique;

ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_account_campaign_unique 
UNIQUE (ad_account_id, campaign_id);

-- ========================================
-- FASE 5: Criar índice para performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_campaigns_sync_enabled 
ON public.campaigns(sync_enabled) WHERE sync_enabled = true;