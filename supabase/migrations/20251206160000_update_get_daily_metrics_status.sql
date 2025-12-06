CREATE OR REPLACE FUNCTION get_daily_metrics(
  p_user_id UUID,
  p_date_from DATE,
  p_date_to DATE,
  p_account_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  spend NUMERIC,
  revenue NUMERIC,
  impressions BIGINT,
  clicks BIGINT,
  conversions INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.date,
    COALESCE(SUM(m.spend), 0)::NUMERIC as spend,
    COALESCE(SUM(m.conversions * 100), 0)::NUMERIC as revenue, -- Placeholder for revenue
    COALESCE(SUM(m.impressions), 0)::BIGINT as impressions,
    COALESCE(SUM(m.clicks), 0)::BIGINT as clicks,
    COALESCE(SUM(m.conversions), 0)::INTEGER as conversions
  FROM public.metrics m
  JOIN public.campaigns c ON c.id = m.campaign_id
  JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
  JOIN public.integrations i ON i.id = aa.integration_id
  WHERE i.user_id = p_user_id
    AND m.date >= p_date_from
    AND m.date <= p_date_to
    AND (p_account_id IS NULL OR aa.id = p_account_id)
    AND (p_status IS NULL OR c.status = p_status)
  GROUP BY m.date
  ORDER BY m.date;
END;
$$;
