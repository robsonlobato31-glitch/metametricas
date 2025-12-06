-- Create RPC function for timeline metrics
CREATE OR REPLACE FUNCTION public.get_timeline_metrics(
  p_user_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_provider TEXT DEFAULT NULL
)
RETURNS TABLE(
  metric_date DATE,
  total_spend NUMERIC,
  total_revenue NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.date as metric_date,
    COALESCE(SUM(m.spend), 0) as total_spend,
    COALESCE(SUM(m.conversion_value), 0) as total_revenue
  FROM metrics m
  JOIN campaigns c ON m.campaign_id = c.id
  JOIN ad_accounts aa ON c.ad_account_id = aa.id
  JOIN integrations i ON aa.integration_id = i.id
  WHERE i.user_id = p_user_id
    AND m.date >= p_date_from
    AND m.date <= p_date_to
    AND (p_provider IS NULL OR aa.provider::TEXT = p_provider)
  GROUP BY m.date
  ORDER BY m.date;
$$;

-- Create RPC function for funnel metrics
CREATE OR REPLACE FUNCTION public.get_funnel_metrics(
  p_user_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_provider TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_impressions BIGINT,
  total_link_clicks INTEGER,
  total_page_views INTEGER,
  total_initiated_checkout INTEGER,
  total_purchases INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(m.impressions), 0)::BIGINT as total_impressions,
    COALESCE(SUM(m.link_clicks), 0)::INTEGER as total_link_clicks,
    COALESCE(SUM(m.page_views), 0)::INTEGER as total_page_views,
    COALESCE(SUM(m.initiated_checkout), 0)::INTEGER as total_initiated_checkout,
    COALESCE(SUM(m.purchases), 0)::INTEGER as total_purchases
  FROM metrics m
  JOIN campaigns c ON m.campaign_id = c.id
  JOIN ad_accounts aa ON c.ad_account_id = aa.id
  JOIN integrations i ON aa.integration_id = i.id
  WHERE i.user_id = p_user_id
    AND m.date >= p_date_from
    AND m.date <= p_date_to
    AND (p_provider IS NULL OR aa.provider::TEXT = p_provider);
$$;

-- Add missing DELETE policies for security
CREATE POLICY "Users can delete own alerts"
ON public.campaign_alerts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM campaigns
  JOIN ad_accounts ON ad_accounts.id = campaigns.ad_account_id
  JOIN integrations ON integrations.id = ad_accounts.integration_id
  WHERE campaigns.id = campaign_alerts.campaign_id
  AND integrations.user_id = auth.uid()
));

CREATE POLICY "Users can delete own metrics"
ON public.metrics FOR DELETE
USING (EXISTS (
  SELECT 1 FROM campaigns
  JOIN ad_accounts ON ad_accounts.id = campaigns.ad_account_id
  JOIN integrations ON integrations.id = ad_accounts.integration_id
  WHERE campaigns.id = metrics.campaign_id
  AND integrations.user_id = auth.uid()
));

CREATE POLICY "Users can delete own metric breakdowns"
ON public.metric_breakdowns FOR DELETE
USING (EXISTS (
  SELECT 1 FROM campaigns c
  JOIN ad_accounts aa ON aa.id = c.ad_account_id
  JOIN integrations i ON i.id = aa.integration_id
  WHERE c.id = metric_breakdowns.campaign_id
  AND i.user_id = auth.uid()
));

-- Fix search_path in vulnerable functions
CREATE OR REPLACE FUNCTION public.update_ad_groups_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;