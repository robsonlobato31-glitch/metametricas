-- Create unique indexes for UPSERT operations

-- For metrics table: unique on campaign_id, date, ad_id (handling NULL ad_id)
DROP INDEX IF EXISTS idx_metrics_campaign_date_ad_unique;
CREATE UNIQUE INDEX idx_metrics_campaign_date_ad_unique 
ON metrics (campaign_id, date, COALESCE(ad_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- For metric_breakdowns table: unique on campaign_id, date, breakdown_type, breakdown_value
DROP INDEX IF EXISTS idx_metric_breakdowns_unique;
CREATE UNIQUE INDEX idx_metric_breakdowns_unique 
ON metric_breakdowns (campaign_id, date, breakdown_type, breakdown_value);