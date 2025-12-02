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

      // Get only campaigns that have active alerts (triggered)
      const { data: alertsData, error: alertsError } = await supabase
        .from('campaign_alerts')
        .select(`
          campaign_id,
          current_amount,
          threshold_amount,
          triggered_at,
          campaigns!inner(
            id,
            name,
            status,
            daily_budget,
            ad_accounts!inner(
              account_name,
              provider,
              integrations!inner(
                user_id
              )
            )
          )
        `)
        .eq('is_active', true)
        .eq('campaigns.ad_accounts.integrations.user_id', user.id)
        .order('triggered_at', { ascending: false });

      if (alertsError) throw alertsError;
      if (!alertsData || alertsData.length === 0) return [];

      // Group by campaign_id to get unique campaigns with alerts
      const campaignMap = new Map<string, MonitoredCampaign>();
      
      alertsData.forEach((alert) => {
        const campaign = alert.campaigns as any;
        if (!campaign || campaignMap.has(alert.campaign_id)) return;

        const dailyBudget = Number(campaign.daily_budget) || 0;
        const monthlyBudget = dailyBudget * 30;
        const currentSpend = Number(alert.current_amount) || 0;
        const percentage = monthlyBudget > 0 ? (currentSpend / monthlyBudget) * 100 : 0;

        campaignMap.set(alert.campaign_id, {
          campaign_id: alert.campaign_id,
          campaign_name: campaign.name,
          status: campaign.status,
          daily_budget: dailyBudget,
          monthly_budget: monthlyBudget,
          current_spend: currentSpend,
          percentage,
          account_name: campaign.ad_accounts?.account_name || 'Conta não identificada',
          provider: campaign.ad_accounts?.provider || 'unknown',
          updated_at: alert.triggered_at,
        });
      });

      // Filter only campaigns with spend > 0 and sort by percentage descending
      return Array.from(campaignMap.values())
        .filter((c) => c.current_spend > 0)
        .sort((a, b) => b.percentage - a.percentage);
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
