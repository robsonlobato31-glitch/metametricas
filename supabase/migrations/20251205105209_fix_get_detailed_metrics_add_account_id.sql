-- Fix get_detailed_metrics to return ad_account_id for proper filtering
DROP FUNCTION IF EXISTS public.get_detailed_metrics(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_detailed_metrics(p_user_id uuid, p_date_from date, p_date_to date)
RETURNS TABLE(
  provider text,
  ad_account_id uuid,
  total_impressions bigint,
  total_clicks bigint,
  total_spend numeric,
  total_conversions integer,
  total_link_clicks integer,
  total_page_views integer,
  total_initiated_checkout integer,
  total_purchases integer,
  total_video_views_25 integer,
  total_video_views_50 integer,
  total_video_views_75 integer,
  total_video_views_100 integer,
  total_results integer,
  total_messages integer,
  avg_ctr numeric,
  avg_cpc numeric,
  avg_cost_per_result numeric,
  avg_cost_per_message numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    aa.provider::TEXT,
    aa.id::UUID as ad_account_id,
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
    COALESCE(SUM(m.results), 0)::INTEGER as total_results,
    COALESCE(SUM(m.messages), 0)::INTEGER as total_messages,
    CASE 
      WHEN SUM(m.impressions) > 0 
      THEN ROUND((SUM(m.clicks)::NUMERIC / SUM(m.impressions)::NUMERIC * 100), 2)
      ELSE 0 
    END::NUMERIC as avg_ctr,
    CASE 
      WHEN SUM(m.clicks) > 0 
      THEN ROUND((SUM(m.spend)::NUMERIC / SUM(m.clicks)::NUMERIC), 2)
      ELSE 0 
    END::NUMERIC as avg_cpc,
    CASE 
      WHEN SUM(m.results) > 0 
      THEN ROUND((SUM(m.spend)::NUMERIC / SUM(m.results)::NUMERIC), 2)
      ELSE 0 
    END::NUMERIC as avg_cost_per_result,
    CASE 
      WHEN SUM(m.messages) > 0 
      THEN ROUND((SUM(m.spend)::NUMERIC / SUM(m.messages)::NUMERIC), 2)
      ELSE 0 
    END::NUMERIC as avg_cost_per_message
  FROM public.campaigns c
  JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
  JOIN public.integrations i ON i.id = aa.integration_id
  LEFT JOIN public.metrics m ON m.campaign_id = c.id 
    AND m.date >= p_date_from 
    AND m.date <= p_date_to
  WHERE i.user_id = p_user_id
  GROUP BY aa.provider, aa.id;
END;
$function$;
