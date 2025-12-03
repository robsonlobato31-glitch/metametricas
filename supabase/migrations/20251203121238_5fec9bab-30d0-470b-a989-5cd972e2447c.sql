-- Create function to get chart metrics aggregated by date
CREATE OR REPLACE FUNCTION public.get_chart_metrics(
  p_user_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE(metric_date DATE, total_spend NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.date as metric_date,
    COALESCE(SUM(m.spend), 0) as total_spend
  FROM metrics m
  JOIN campaigns c ON m.campaign_id = c.id
  JOIN ad_accounts aa ON c.ad_account_id = aa.id
  JOIN integrations i ON aa.integration_id = i.id
  WHERE i.user_id = p_user_id
    AND m.date >= p_date_from
    AND m.date <= p_date_to
  GROUP BY m.date
  ORDER BY m.date;
$$;