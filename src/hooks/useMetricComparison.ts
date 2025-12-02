import { useMemo } from 'react';
import { subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface MetricComparison {
  current: number;
  previous: number;
  variation: number;
  variationPercent: number;
  isPositive: boolean;
  isNegative: boolean;
}

interface MetricsComparisonData {
  impressions: MetricComparison;
  clicks: MetricComparison;
  spend: MetricComparison;
  conversions: MetricComparison;
  results: MetricComparison;
  messages: MetricComparison;
  ctr: MetricComparison;
  cpc: MetricComparison;
  costPerResult: MetricComparison;
  costPerMessage: MetricComparison;
}

const calculateComparison = (current: number, previous: number): MetricComparison => {
  const variation = current - previous;
  const variationPercent = previous !== 0 ? ((variation / previous) * 100) : 0;
  
  return {
    current,
    previous,
    variation,
    variationPercent,
    isPositive: variation > 0,
    isNegative: variation < 0,
  };
};

export const useMetricComparison = (periodDays: number = 30) => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['metric-comparison', user?.id, periodDays],
    queryFn: async () => {
      if (!user?.id) return null;

      const now = new Date();
      const currentPeriodEnd = now;
      const currentPeriodStart = subDays(now, periodDays);
      const previousPeriodEnd = subDays(now, periodDays);
      const previousPeriodStart = subDays(now, periodDays * 2);

      // Get current period metrics
      const { data: currentData } = await supabase
        .from('metrics')
        .select(`
          impressions,
          clicks,
          spend,
          conversions,
          results,
          messages,
          campaigns!inner(
            ad_accounts!inner(
              integrations!inner(user_id)
            )
          )
        `)
        .gte('date', currentPeriodStart.toISOString().split('T')[0])
        .lte('date', currentPeriodEnd.toISOString().split('T')[0])
        .eq('campaigns.ad_accounts.integrations.user_id', user.id);

      // Get previous period metrics
      const { data: previousData } = await supabase
        .from('metrics')
        .select(`
          impressions,
          clicks,
          spend,
          conversions,
          results,
          messages,
          campaigns!inner(
            ad_accounts!inner(
              integrations!inner(user_id)
            )
          )
        `)
        .gte('date', previousPeriodStart.toISOString().split('T')[0])
        .lt('date', previousPeriodEnd.toISOString().split('T')[0])
        .eq('campaigns.ad_accounts.integrations.user_id', user.id);

      // Calculate totals for current period
      const currentTotals = (currentData || []).reduce(
        (acc, m) => ({
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          spend: acc.spend + (m.spend || 0),
          conversions: acc.conversions + (m.conversions || 0),
          results: acc.results + (m.results || 0),
          messages: acc.messages + (m.messages || 0),
        }),
        { impressions: 0, clicks: 0, spend: 0, conversions: 0, results: 0, messages: 0 }
      );

      // Calculate totals for previous period
      const previousTotals = (previousData || []).reduce(
        (acc, m) => ({
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          spend: acc.spend + (m.spend || 0),
          conversions: acc.conversions + (m.conversions || 0),
          results: acc.results + (m.results || 0),
          messages: acc.messages + (m.messages || 0),
        }),
        { impressions: 0, clicks: 0, spend: 0, conversions: 0, results: 0, messages: 0 }
      );

      // Calculate derived metrics
      const currentCtr = currentTotals.impressions > 0 
        ? (currentTotals.clicks / currentTotals.impressions * 100) 
        : 0;
      const previousCtr = previousTotals.impressions > 0 
        ? (previousTotals.clicks / previousTotals.impressions * 100) 
        : 0;

      const currentCpc = currentTotals.clicks > 0 
        ? (currentTotals.spend / currentTotals.clicks) 
        : 0;
      const previousCpc = previousTotals.clicks > 0 
        ? (previousTotals.spend / previousTotals.clicks) 
        : 0;

      const currentCostPerResult = currentTotals.results > 0 
        ? (currentTotals.spend / currentTotals.results) 
        : 0;
      const previousCostPerResult = previousTotals.results > 0 
        ? (previousTotals.spend / previousTotals.results) 
        : 0;

      const currentCostPerMessage = currentTotals.messages > 0 
        ? (currentTotals.spend / currentTotals.messages) 
        : 0;
      const previousCostPerMessage = previousTotals.messages > 0 
        ? (previousTotals.spend / previousTotals.messages) 
        : 0;

      return {
        impressions: calculateComparison(currentTotals.impressions, previousTotals.impressions),
        clicks: calculateComparison(currentTotals.clicks, previousTotals.clicks),
        spend: calculateComparison(currentTotals.spend, previousTotals.spend),
        conversions: calculateComparison(currentTotals.conversions, previousTotals.conversions),
        results: calculateComparison(currentTotals.results, previousTotals.results),
        messages: calculateComparison(currentTotals.messages, previousTotals.messages),
        ctr: calculateComparison(currentCtr, previousCtr),
        cpc: calculateComparison(currentCpc, previousCpc),
        costPerResult: calculateComparison(currentCostPerResult, previousCostPerResult),
        costPerMessage: calculateComparison(currentCostPerMessage, previousCostPerMessage),
      } as MetricsComparisonData;
    },
    enabled: !!user?.id,
  });

  return { comparisonData: data, isLoading };
};

export type { MetricComparison, MetricsComparisonData };
