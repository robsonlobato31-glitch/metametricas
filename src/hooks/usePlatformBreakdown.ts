import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays } from 'date-fns';

interface PlatformMetrics {
  provider: string;
  impressions: number;
  clicks: number;
  spend: number;
  results: number;
  messages: number;
  cpc: number;
  ctr: number;
  costPerResult: number;
  costPerMessage: number;
}

export const usePlatformBreakdown = (periodDays: number = 30) => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['platform-breakdown', user?.id, periodDays],
    queryFn: async () => {
      if (!user?.id) return [];

      const dateFrom = subDays(new Date(), periodDays).toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];

      const { data: metrics, error } = await supabase
        .from('metrics')
        .select(`
          impressions,
          clicks,
          spend,
          results,
          messages,
          campaigns!inner(
            ad_accounts!inner(
              provider,
              integrations!inner(user_id)
            )
          )
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .eq('campaigns.ad_accounts.integrations.user_id', user.id);

      if (error) {
        console.error('Error fetching platform breakdown:', error);
        return [];
      }

      // Group by provider
      const providerMap = new Map<string, {
        impressions: number;
        clicks: number;
        spend: number;
        results: number;
        messages: number;
      }>();

      metrics?.forEach((m: any) => {
        const provider = m.campaigns?.ad_accounts?.provider || 'unknown';
        const existing = providerMap.get(provider) || {
          impressions: 0,
          clicks: 0,
          spend: 0,
          results: 0,
          messages: 0,
        };

        providerMap.set(provider, {
          impressions: existing.impressions + (m.impressions || 0),
          clicks: existing.clicks + (m.clicks || 0),
          spend: existing.spend + (m.spend || 0),
          results: existing.results + (m.results || 0),
          messages: existing.messages + (m.messages || 0),
        });
      });

      // Calculate derived metrics and format
      const platformData: PlatformMetrics[] = Array.from(providerMap.entries()).map(
        ([provider, totals]) => ({
          provider: provider === 'meta' ? 'Meta Ads' : provider === 'google' ? 'Google Ads' : provider,
          impressions: totals.impressions,
          clicks: totals.clicks,
          spend: totals.spend,
          results: totals.results,
          messages: totals.messages,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0,
          cpc: totals.clicks > 0 ? (totals.spend / totals.clicks) : 0,
          costPerResult: totals.results > 0 ? (totals.spend / totals.results) : 0,
          costPerMessage: totals.messages > 0 ? (totals.spend / totals.messages) : 0,
        })
      );

      return platformData;
    },
    enabled: !!user?.id,
  });

  // Calculate total for percentage
  const totalSpend = useMemo(() => {
    return data?.reduce((acc, p) => acc + p.spend, 0) || 0;
  }, [data]);

  // Add percentage to each platform
  const platformDataWithPercentage = useMemo(() => {
    return data?.map(p => ({
      ...p,
      percentage: totalSpend > 0 ? (p.spend / totalSpend * 100) : 0,
    })) || [];
  }, [data, totalSpend]);

  return { platformData: platformDataWithPercentage, isLoading };
};

export type { PlatformMetrics };
