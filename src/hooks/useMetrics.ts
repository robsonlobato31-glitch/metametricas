import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format } from 'date-fns';
import { useMemo } from 'react';

type MetricsData = {
  provider: string;
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  total_conversions: number;
  total_link_clicks: number;
  total_page_views: number;
  total_initiated_checkout: number;
  total_purchases: number;
  total_video_views_25: number;
  total_video_views_50: number;
  total_video_views_75: number;
  total_video_views_100: number;
  avg_ctr: number;
  avg_cpc: number;
};

export const useMetrics = (dateFrom?: Date, dateTo?: Date) => {
  const { user } = useAuth();

  // Estabilizar datas como strings para evitar recriação do queryKey
  const dateFromStr = useMemo(() => 
    format(dateFrom || subDays(new Date(), 30), 'yyyy-MM-dd'), 
    [dateFrom]
  );
  
  const dateToStr = useMemo(() => 
    format(dateTo || new Date(), 'yyyy-MM-dd'), 
    [dateTo]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['metrics', user?.id, dateFromStr, dateToStr],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('[useMetrics] Fetching metrics:', { user_id: user.id, dateFromStr, dateToStr });

      const { data, error } = await supabase.rpc('get_detailed_metrics', {
        p_user_id: user.id,
        p_date_from: dateFromStr,
        p_date_to: dateToStr,
      });

      if (error) {
        console.error('[useMetrics] Error fetching metrics:', error);
        throw error;
      }

      console.log('[useMetrics] Metrics fetched successfully:', data);
      return (data || []) as MetricsData[];
    },
    enabled: !!user?.id,
  });

  // Calculate totals across all providers
  const totals = data?.reduce(
    (acc, curr) => ({
      impressions: acc.impressions + Number(curr.total_impressions || 0),
      clicks: acc.clicks + Number(curr.total_clicks || 0),
      spend: acc.spend + Number(curr.total_spend || 0),
      conversions: acc.conversions + Number(curr.total_conversions || 0),
      link_clicks: acc.link_clicks + Number(curr.total_link_clicks || 0),
      page_views: acc.page_views + Number(curr.total_page_views || 0),
      initiated_checkout: acc.initiated_checkout + Number(curr.total_initiated_checkout || 0),
      purchases: acc.purchases + Number(curr.total_purchases || 0),
      video_views_25: acc.video_views_25 + Number(curr.total_video_views_25 || 0),
      video_views_50: acc.video_views_50 + Number(curr.total_video_views_50 || 0),
      video_views_75: acc.video_views_75 + Number(curr.total_video_views_75 || 0),
      video_views_100: acc.video_views_100 + Number(curr.total_video_views_100 || 0),
    }),
    {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      link_clicks: 0,
      page_views: 0,
      initiated_checkout: 0,
      purchases: 0,
      video_views_25: 0,
      video_views_50: 0,
      video_views_75: 0,
      video_views_100: 0,
    }
  );

  // Calculate average CTR and CPC
  const avgCtr = data?.length
    ? data.reduce((sum, curr) => sum + Number(curr.avg_ctr || 0), 0) / data.length
    : 0;

  const avgCpc = data?.length
    ? data.reduce((sum, curr) => sum + Number(curr.avg_cpc || 0), 0) / data.length
    : 0;

  // Get metrics by provider
  const metaMetrics = data?.find((m) => m.provider === 'meta');
  const googleMetrics = data?.find((m) => m.provider === 'google');

  return {
    data,
    totals: totals
      ? {
          ...totals,
          ctr: avgCtr,
          cpc: avgCpc,
        }
      : null,
    metaMetrics: metaMetrics
      ? {
          impressions: Number(metaMetrics.total_impressions || 0),
          clicks: Number(metaMetrics.total_clicks || 0),
          spend: Number(metaMetrics.total_spend || 0),
          conversions: Number(metaMetrics.total_conversions || 0),
          link_clicks: Number(metaMetrics.total_link_clicks || 0),
          page_views: Number(metaMetrics.total_page_views || 0),
          initiated_checkout: Number(metaMetrics.total_initiated_checkout || 0),
          purchases: Number(metaMetrics.total_purchases || 0),
          ctr: Number(metaMetrics.avg_ctr || 0),
          cpc: Number(metaMetrics.avg_cpc || 0),
        }
      : null,
    googleMetrics: googleMetrics
      ? {
          impressions: Number(googleMetrics.total_impressions || 0),
          clicks: Number(googleMetrics.total_clicks || 0),
          spend: Number(googleMetrics.total_spend || 0),
          conversions: Number(googleMetrics.total_conversions || 0),
          link_clicks: Number(googleMetrics.total_link_clicks || 0),
          page_views: Number(googleMetrics.total_page_views || 0),
          initiated_checkout: Number(googleMetrics.total_initiated_checkout || 0),
          purchases: Number(googleMetrics.total_purchases || 0),
          ctr: Number(googleMetrics.avg_ctr || 0),
          cpc: Number(googleMetrics.avg_cpc || 0),
        }
      : null,
    isLoading,
    error,
    refetch,
  };
};
