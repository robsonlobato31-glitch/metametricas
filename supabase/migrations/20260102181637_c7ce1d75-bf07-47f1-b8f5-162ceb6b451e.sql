-- ========================================
-- FASE 1: REMOVER MÉTRICAS DUPLICADAS PRIMEIRO
-- ========================================

-- Remover métricas duplicadas mantendo apenas a mais recente
WITH metrics_duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id, date, COALESCE(ad_id, '00000000-0000-0000-0000-000000000000'::uuid) ORDER BY updated_at DESC, id) as rn
  FROM metrics
)
DELETE FROM metrics WHERE id IN (
  SELECT id FROM metrics_duplicates WHERE rn > 1
);

-- Remover breakdowns duplicados
WITH breakdowns_duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id, date, breakdown_type, breakdown_value ORDER BY updated_at DESC, id) as rn
  FROM metric_breakdowns
)
DELETE FROM metric_breakdowns WHERE id IN (
  SELECT id FROM breakdowns_duplicates WHERE rn > 1
);

-- ========================================
-- FASE 2: DELETAR DADOS DE CAMPANHAS DUPLICADAS (não migrar)
-- ========================================

-- Identificar campanhas duplicadas para deletar
WITH campaign_duplicates AS (
  SELECT id, campaign_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY updated_at DESC, id) as rn
  FROM campaigns
),
campaigns_to_delete AS (
  SELECT id FROM campaign_duplicates WHERE rn > 1
)
-- Deletar métricas das campanhas duplicadas
DELETE FROM metrics WHERE campaign_id IN (SELECT id FROM campaigns_to_delete);

-- Deletar breakdowns das campanhas duplicadas
WITH campaign_duplicates AS (
  SELECT id, campaign_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY updated_at DESC, id) as rn
  FROM campaigns
),
campaigns_to_delete AS (
  SELECT id FROM campaign_duplicates WHERE rn > 1
)
DELETE FROM metric_breakdowns WHERE campaign_id IN (SELECT id FROM campaigns_to_delete);

-- Deletar alerts das campanhas duplicadas
WITH campaign_duplicates AS (
  SELECT id, campaign_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY updated_at DESC, id) as rn
  FROM campaigns
),
campaigns_to_delete AS (
  SELECT id FROM campaign_duplicates WHERE rn > 1
)
DELETE FROM campaign_alerts WHERE campaign_id IN (SELECT id FROM campaigns_to_delete);

-- Deletar ad_sets das campanhas duplicadas
WITH campaign_duplicates AS (
  SELECT id, campaign_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY updated_at DESC, id) as rn
  FROM campaigns
),
campaigns_to_delete AS (
  SELECT id FROM campaign_duplicates WHERE rn > 1
)
DELETE FROM ad_sets WHERE campaign_id IN (SELECT id FROM campaigns_to_delete);

-- Deletar campanhas duplicadas
WITH campaign_duplicates AS (
  SELECT id, campaign_id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY updated_at DESC, id) as rn
  FROM campaigns
)
DELETE FROM campaigns WHERE id IN (
  SELECT id FROM campaign_duplicates WHERE rn > 1
);

-- ========================================
-- FASE 3: DELETAR DADOS DE CONTAS DUPLICADAS
-- ========================================

-- Deletar campanhas (e cascata) das contas duplicadas
WITH account_duplicates AS (
  SELECT id, account_id,
    ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY updated_at DESC, id) as rn
  FROM ad_accounts
),
accounts_to_delete AS (
  SELECT id FROM account_duplicates WHERE rn > 1
)
DELETE FROM campaigns WHERE ad_account_id IN (SELECT id FROM accounts_to_delete);

-- Deletar contas duplicadas
WITH account_duplicates AS (
  SELECT id, account_id,
    ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY updated_at DESC, id) as rn
  FROM ad_accounts
)
DELETE FROM ad_accounts WHERE id IN (
  SELECT id FROM account_duplicates WHERE rn > 1
);

-- ========================================
-- FASE 4: DESATIVAR DADOS SEM VALOR
-- ========================================

-- Desativar campanhas sem gasto
UPDATE campaigns SET sync_enabled = false
WHERE id NOT IN (
  SELECT DISTINCT campaign_id FROM metrics WHERE spend > 0
)
AND sync_enabled = true;

-- Desativar campanhas deletadas/arquivadas
UPDATE campaigns SET sync_enabled = false
WHERE status IN ('DELETED', 'ARCHIVED', 'deleted', 'archived')
AND sync_enabled = true;

-- Desativar contas sem métricas recentes
UPDATE ad_accounts SET is_active = false
WHERE id NOT IN (
  SELECT DISTINCT c.ad_account_id 
  FROM campaigns c
  JOIN metrics m ON m.campaign_id = c.id
  WHERE m.date > NOW() - INTERVAL '90 days'
    AND m.spend > 0
);

-- ========================================
-- FASE 5: LIMPAR DADOS ÓRFÃOS
-- ========================================

DELETE FROM metrics WHERE campaign_id NOT IN (SELECT id FROM campaigns);
DELETE FROM metric_breakdowns WHERE campaign_id NOT IN (SELECT id FROM campaigns);
DELETE FROM ad_sets WHERE campaign_id NOT IN (SELECT id FROM campaigns);
DELETE FROM ads WHERE ad_set_id NOT IN (SELECT id FROM ad_sets);
DELETE FROM campaign_alerts WHERE campaign_id NOT IN (SELECT id FROM campaigns);

-- ========================================
-- FASE 6: ADICIONAR CONSTRAINTS ÚNICAS
-- ========================================

ALTER TABLE ad_accounts DROP CONSTRAINT IF EXISTS unique_account_id;
ALTER TABLE ad_accounts ADD CONSTRAINT unique_account_id UNIQUE (account_id);

ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS unique_campaign_id;
ALTER TABLE campaigns ADD CONSTRAINT unique_campaign_id UNIQUE (campaign_id);

-- Limpar logs antigos
DELETE FROM sync_logs WHERE created_at < NOW() - INTERVAL '30 days';