import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type MonitoredCampaign = {
  campaign_id: string;
  campaign_name: string;
  status: string;
  daily_budget: number;
  monthly_budget: number;
  current_spend: number;
  percentage: number;
  account_name: string;
  provider: string;
  updated_at: string;
};

export const useMonitoredCampaigns = () => {
  const { user } = useAuth();

  const { data: campaigns, isLoading, error, refetch } = useQuery({
    queryKey: ['monitored-campaigns', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all active campaigns with daily_budget for this user
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          status,
          daily_budget,
          updated_at,
          ad_accounts!inner(
            account_name,
            provider,
            integrations!inner(
              user_id
            )
          )
        `)
        .eq('status', 'ACTIVE')
        .not('daily_budget', 'is', null)
        .gt('daily_budget', 0)
        .eq('ad_accounts.integrations.user_id', user.id);

      if (campaignsError) throw campaignsError;
      if (!campaignsData || campaignsData.length === 0) return [];

      // Get campaign IDs
      const campaignIds = campaignsData.map(c => c.id);

      // Fetch total spend for each campaign from metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('metrics')
        .select('campaign_id, spend')
        .in('campaign_id', campaignIds);

      if (metricsError) throw metricsError;

      // Calculate total spend per campaign
      const spendByCampaign = new Map<string, number>();
      (metricsData || []).forEach((metric) => {
        const currentSpend = spendByCampaign.get(metric.campaign_id) || 0;
        spendByCampaign.set(metric.campaign_id, currentSpend + (Number(metric.spend) || 0));
      });

      // Map to MonitoredCampaign format
      const now = new Date().toISOString();
      const result: MonitoredCampaign[] = campaignsData.map((campaign) => {
        const dailyBudget = Number(campaign.daily_budget) || 0;
        const monthlyBudget = dailyBudget * 30;
        const currentSpend = spendByCampaign.get(campaign.id) || 0;
        const percentage = monthlyBudget > 0 ? (currentSpend / monthlyBudget) * 100 : 0;

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: campaign.status,
          daily_budget: dailyBudget,
          monthly_budget: monthlyBudget,
          current_spend: currentSpend,
          percentage,
          account_name: (campaign.ad_accounts as any)?.account_name || 'Conta não identificada',
          provider: (campaign.ad_accounts as any)?.provider || 'unknown',
          updated_at: now,
        };
      });

      // Sort by percentage descending (highest risk first)
      return result.sort((a, b) => b.percentage - a.percentage);
    },
    enabled: !!user?.id,
  });

  return {
    campaigns: campaigns || [],
    isLoading,
    error,
    refetch,
  };
};
