import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format } from 'date-fns';
import { useMemo } from 'react';

type MetricsData = {
  provider: string;
  ad_account_id: string;
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
  total_results: number;
  total_messages: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cost_per_result: number;
  avg_cost_per_message: number;
};

export const useMetrics = (dateFrom?: Date, dateTo?: Date, accountId?: string, provider?: string) => {
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
    queryKey: ['metrics', user?.id, dateFromStr, dateToStr, accountId, provider],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('[useMetrics] Fetching metrics:', { user_id: user.id, dateFromStr, dateToStr, accountId, provider });

      const { data, error } = await supabase.rpc('get_detailed_metrics', {
        p_user_id: user.id,
        p_date_from: dateFromStr,
        p_date_to: dateToStr,
      });

      if (error) {
        console.error('[useMetrics] Error fetching metrics:', error);
        throw error;
      }

      // Filter by account if accountId is provided
      let filteredData = data || [];

      if (accountId) {
        filteredData = filteredData.filter((metric: any) => metric.ad_account_id === accountId);
      }

      // Filter by provider if provided
      if (provider) {
        filteredData = filteredData.filter((metric: any) => metric.provider === provider);
      }

      console.log('[useMetrics] Metrics fetched successfully:', filteredData);
      return filteredData as MetricsData[];
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
      results: acc.results + Number(curr.total_results || 0),
      messages: acc.messages + Number(curr.total_messages || 0),
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
      results: 0,
      messages: 0,
    }
  );

  // Calculate averages
  const avgCtr = data?.length
    ? data.reduce((sum, curr) => sum + Number(curr.avg_ctr || 0), 0) / data.length
    : 0;

  const avgCpc = data?.length
    ? data.reduce((sum, curr) => sum + Number(curr.avg_cpc || 0), 0) / data.length
    : 0;

  const avgCostPerResult = data?.length
    ? data.reduce((sum, curr) => sum + Number(curr.avg_cost_per_result || 0), 0) / data.length
    : 0;

  const avgCostPerMessage = data?.length
    ? data.reduce((sum, curr) => sum + Number(curr.avg_cost_per_message || 0), 0) / data.length
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
        cost_per_result: avgCostPerResult,
        cost_per_message: avgCostPerMessage,
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
        results: Number(metaMetrics.total_results || 0),
        messages: Number(metaMetrics.total_messages || 0),
        ctr: Number(metaMetrics.avg_ctr || 0),
        cpc: Number(metaMetrics.avg_cpc || 0),
        cost_per_result: Number(metaMetrics.avg_cost_per_result || 0),
        cost_per_message: Number(metaMetrics.avg_cost_per_message || 0),
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
        results: Number(googleMetrics.total_results || 0),
        messages: Number(googleMetrics.total_messages || 0),
        ctr: Number(googleMetrics.avg_ctr || 0),
        cpc: Number(googleMetrics.avg_cpc || 0),
        cost_per_result: Number(googleMetrics.avg_cost_per_result || 0),
        cost_per_message: Number(googleMetrics.avg_cost_per_message || 0),
      }
      : null,
    isLoading,
    error,
    refetch,
  };
};
