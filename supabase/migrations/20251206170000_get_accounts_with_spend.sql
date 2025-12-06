CREATE OR REPLACE FUNCTION get_accounts_with_spend(
  p_user_id UUID
)
RETURNS TABLE (
  account_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.ad_account_id
  FROM public.metrics m
  JOIN public.campaigns c ON c.id = m.campaign_id
  JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
  JOIN public.integrations i ON i.id = aa.integration_id
  WHERE i.user_id = p_user_id
    AND m.spend > 0;
END;
$$;
