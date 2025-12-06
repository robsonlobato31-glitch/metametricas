-- Migration: Add Performance Indexes
-- Created: 2025-12-05
-- Purpose: Optimize query performance by adding composite indexes on frequently queried columns

-- Índice para queries de métricas por campanha e data (ordenado DESC para queries recentes)
CREATE INDEX IF NOT EXISTS idx_metrics_campaign_date 
  ON metrics(campaign_id, date DESC);

-- Índice para filtros de campanhas por conta e status
CREATE INDEX IF NOT EXISTS idx_campaigns_account_status 
  ON campaigns(ad_account_id, status);

-- Índice para metric breakdowns por campanha e tipo
CREATE INDEX IF NOT EXISTS idx_metric_breakdowns_campaign 
  ON metric_breakdowns(campaign_id, breakdown_type);

-- Índice para ad_sets por campanha (otimiza joins)
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign 
  ON ad_sets(campaign_id);

-- Índice para ads por ad_set (otimiza joins)
CREATE INDEX IF NOT EXISTS idx_ads_ad_set 
  ON ads(ad_set_id);

-- Índice para integrations por user_id e provider (otimiza autenticação)
CREATE INDEX IF NOT EXISTS idx_integrations_user_provider 
  ON integrations(user_id, provider);

-- Índice para sync_logs por integration_id e status (otimiza monitoramento)
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration_status 
  ON sync_logs(integration_id, status, started_at DESC);

-- Comentários explicativos
COMMENT ON INDEX idx_metrics_campaign_date IS 'Optimizes metrics queries filtered by campaign and date range';
COMMENT ON INDEX idx_campaigns_account_status IS 'Optimizes campaign list queries filtered by account and status';
COMMENT ON INDEX idx_metric_breakdowns_campaign IS 'Optimizes demographic breakdown queries';
COMMENT ON INDEX idx_ad_sets_campaign IS 'Optimizes joins between campaigns and ad_sets';
COMMENT ON INDEX idx_ads_ad_set IS 'Optimizes joins between ad_sets and ads';
COMMENT ON INDEX idx_integrations_user_provider IS 'Optimizes integration lookups during authentication';
COMMENT ON INDEX idx_sync_logs_integration_status IS 'Optimizes sync log monitoring and history queries';
