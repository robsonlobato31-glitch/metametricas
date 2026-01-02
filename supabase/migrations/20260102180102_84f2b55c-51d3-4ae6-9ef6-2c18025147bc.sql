-- ========================================
-- ÍNDICES PARA OTIMIZAÇÃO DE PERFORMANCE
-- ========================================

-- 1. Tabela campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_objective ON campaigns(objective);
CREATE INDEX IF NOT EXISTS idx_campaigns_name ON campaigns(name);

-- 2. Tabela ad_accounts  
CREATE INDEX IF NOT EXISTS idx_ad_accounts_active_provider ON ad_accounts(is_active, provider);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_name ON ad_accounts(account_name);

-- 3. Tabela metrics
CREATE INDEX IF NOT EXISTS idx_metrics_has_spend ON metrics(campaign_id) WHERE spend > 0;
CREATE INDEX IF NOT EXISTS idx_metrics_campaign_date_spend ON metrics(campaign_id, date, spend);

-- 4. Tabela metric_breakdowns
CREATE INDEX IF NOT EXISTS idx_metric_breakdowns_type ON metric_breakdowns(breakdown_type);

-- 5. Tabela ad_sets
CREATE INDEX IF NOT EXISTS idx_ad_sets_name ON ad_sets(name);

-- 6. Tabela ads
CREATE INDEX IF NOT EXISTS idx_ads_name ON ads(name);