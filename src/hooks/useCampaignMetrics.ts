import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CampaignMetrics {
  campaign_id: string;
  campaign_name: string;
  account_name: string;
  ad_account_id: string;
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
  objective?: string;
  budgetMin?: number;
  budgetMax?: number;
  ctrMin?: number;
  ctrMax?: number;
  cpcMin?: number;
  cpcMax?: number;
  costPerResultMin?: number;
  costPerResultMax?: number;
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

      if (filters?.status && filters.status !== 'HAD_DELIVERY') {
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

      // Validate campaigns array exists
      if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
        console.log('[useCampaignMetrics] No campaigns found for filters:', filters);
        return [];
      }

      // For each campaign, get aggregated metrics
      const metricsPromises = campaigns.map(async (campaign) => {
        try {
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
            account_name: campaign.ad_accounts?.account_name || 'Unknown',
            ad_account_id: campaign.ad_accounts?.id || '',
            provider: campaign.ad_accounts?.provider || 'meta',
            status: campaign.status || 'UNKNOWN',
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
        } catch (error) {
          console.error('[useCampaignMetrics] Error processing campaign:', campaign.id, error);
          // Return default values for failed campaign
          return {
            campaign_id: campaign.id,
            campaign_name: campaign.name || 'Unknown',
            account_name: campaign.ad_accounts?.account_name || 'Unknown',
            ad_account_id: campaign.ad_accounts?.id || '',
            provider: campaign.ad_accounts?.provider || 'meta',
            status: campaign.status || 'UNKNOWN',
            objective: campaign.objective,
            budget: campaign.budget || campaign.daily_budget,
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
            results: 0,
            messages: 0,
            ctr: 0,
            cpc: 0,
            cost_per_result: 0,
            cost_per_message: 0,
          };
        }
      });

      let results = await Promise.all(metricsPromises);

      // Filtrar por "tiveram veiculação" se necessário
      if (filters?.status === 'HAD_DELIVERY') {
        results = results.filter(c => c.impressions > 0 || c.spend > 0);
      }

      // Apply advanced filters
      if (filters?.objective) {
        results = results.filter(c => c.objective === filters.objective);
      }

      if (filters?.budgetMin !== undefined) {
        results = results.filter(c => (c.budget || 0) >= filters.budgetMin!);
      }

      if (filters?.budgetMax !== undefined) {
        results = results.filter(c => (c.budget || 0) <= filters.budgetMax!);
      }

      if (filters?.ctrMin !== undefined) {
        results = results.filter(c => c.ctr >= filters.ctrMin!);
      }

      if (filters?.ctrMax !== undefined) {
        results = results.filter(c => c.ctr <= filters.ctrMax!);
      }

      if (filters?.cpcMin !== undefined) {
        results = results.filter(c => c.cpc >= filters.cpcMin!);
      }

      if (filters?.cpcMax !== undefined) {
        results = results.filter(c => c.cpc <= filters.cpcMax!);
      }

      if (filters?.costPerResultMin !== undefined) {
        results = results.filter(c => c.cost_per_result >= filters.costPerResultMin!);
      }

      if (filters?.costPerResultMax !== undefined) {
        results = results.filter(c => c.cost_per_result <= filters.costPerResultMax!);
      }

      return results;
    },
    enabled: !!user?.id,
  });
};
