import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CampaignMetrics {
  campaign_id: string;
  campaign_name: string;
  account_name: string;
  provider: string;
  status: string;
  objective: string | null;
  budget: number | null;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  results: number;
  messages: number;
  ctr: number;
  cpc: number;
  cost_per_result: number;
  cost_per_message: number;
}

interface CampaignMetricsFilters {
  search?: string;
  provider?: 'meta' | 'google';
  status?: string;
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export const useCampaignMetrics = (filters?: CampaignMetricsFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['campaign-metrics', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch campaigns and metrics separately
        let campaignQuery = supabase
          .from('campaigns')
          .select(`
            *,
            ad_accounts!inner(
              id,
              account_name,
              provider,
              integrations!inner(user_id)
            )
          `)
          .eq('ad_accounts.integrations.user_id', user.id);

        if (filters?.provider) {
          campaignQuery = campaignQuery.eq('ad_accounts.provider', filters.provider);
        }

        if (filters?.status) {
          campaignQuery = campaignQuery.eq('status', filters.status);
        }

        if (filters?.search) {
          campaignQuery = campaignQuery.ilike('name', `%${filters.search}%`);
        }

        if (filters?.accountId) {
          campaignQuery = campaignQuery.eq('ad_account_id', filters.accountId);
        }

      const { data: campaigns, error: campError } = await campaignQuery;

      if (campError) throw campError;

      // For each campaign, get aggregated metrics
      const metricsPromises = campaigns.map(async (campaign) => {
        let metricsQuery = supabase
          .from('metrics')
          .select('*')
          .eq('campaign_id', campaign.id);

        if (filters?.dateFrom) {
          metricsQuery = metricsQuery.gte('date', filters.dateFrom.toISOString().split('T')[0]);
        }

        if (filters?.dateTo) {
          metricsQuery = metricsQuery.lte('date', filters.dateTo.toISOString().split('T')[0]);
        }

        const { data: metrics } = await metricsQuery;

        const totals = metrics?.reduce(
          (acc, m) => ({
            impressions: acc.impressions + (m.impressions || 0),
            clicks: acc.clicks + (m.clicks || 0),
            spend: acc.spend + (m.spend || 0),
            conversions: acc.conversions + (m.conversions || 0),
            results: acc.results + (m.results || 0),
            messages: acc.messages + (m.messages || 0),
          }),
          { impressions: 0, clicks: 0, spend: 0, conversions: 0, results: 0, messages: 0 }
        ) || { impressions: 0, clicks: 0, spend: 0, conversions: 0, results: 0, messages: 0 };

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          account_name: campaign.ad_accounts.account_name,
          provider: campaign.ad_accounts.provider,
          status: campaign.status,
          objective: campaign.objective,
          budget: campaign.budget || campaign.daily_budget,
          impressions: totals.impressions,
          clicks: totals.clicks,
          spend: totals.spend,
          conversions: totals.conversions,
          results: totals.results,
          messages: totals.messages,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
          cost_per_result: totals.results > 0 ? totals.spend / totals.results : 0,
          cost_per_message: totals.messages > 0 ? totals.spend / totals.messages : 0,
        };
      });

      return Promise.all(metricsPromises);
    },
    enabled: !!user?.id,
  });
};
