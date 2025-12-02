import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type CampaignAlertWithDetails = {
  id: string;
  campaign_id: string;
  alert_type: string;
  threshold_amount: number;
  current_amount: number;
  is_active: boolean;
  triggered_at: string;
  resolved_at: string | null;
  created_at: string;
  campaigns: {
    name: string;
    status: string;
    daily_budget: number | null;
    ad_accounts: {
      account_name: string;
      provider: string;
    };
  };
};

export type GroupedCampaignAlert = {
  campaign_id: string;
  campaigns: {
    name: string;
    status: string;
    daily_budget: number | null;
    ad_accounts: {
      account_name: string;
      provider: string;
    };
  };
  current_amount: number;
  updated_at: string;
  triggered_thresholds: number[];
  percentage: number;
};

export const useCampaignAlerts = () => {
  const { user } = useAuth();

  const { data: alerts, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all active alerts for user's campaigns
      const { data, error } = await supabase
        .from('campaign_alerts')
        .select(`
          *,
          campaigns!inner(
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

      if (error) throw error;

      const rawAlerts = (data || []) as unknown as CampaignAlertWithDetails[];

      // Group alerts by campaign_id - keeping only one entry per campaign
      const groupedMap = new Map<string, GroupedCampaignAlert>();

      rawAlerts.forEach((alert) => {
        if (!alert.campaigns || !alert.campaign_id) return;
        
        const existing = groupedMap.get(alert.campaign_id);
        
        if (!existing) {
          const dailyBudget = alert.campaigns.daily_budget || alert.threshold_amount || 0;
          const monthlyBudget = dailyBudget * 30;
          const percentage = monthlyBudget > 0 ? (alert.current_amount / monthlyBudget) * 100 : 0;

          groupedMap.set(alert.campaign_id, {
            campaign_id: alert.campaign_id,
            campaigns: alert.campaigns,
            current_amount: alert.current_amount || 0,
            updated_at: alert.triggered_at,
            triggered_thresholds: [alert.threshold_amount],
            percentage: percentage || 0,
          });
        } else {
          // Add threshold if not already present
          if (!existing.triggered_thresholds.includes(alert.threshold_amount)) {
            existing.triggered_thresholds.push(alert.threshold_amount);
          }
          // Update to most recent values
          if (new Date(alert.triggered_at) > new Date(existing.updated_at)) {
            existing.current_amount = alert.current_amount || 0;
            existing.updated_at = alert.triggered_at;
            // Recalculate percentage
            const dailyBudget = alert.campaigns.daily_budget || alert.threshold_amount || 0;
            const monthlyBudget = dailyBudget * 30;
            existing.percentage = monthlyBudget > 0 ? (existing.current_amount / monthlyBudget) * 100 : 0;
          }
        }
      });

      return Array.from(groupedMap.values());
    },
    enabled: !!user?.id,
  });

  return {
    alerts: alerts || [],
    isLoading,
    error,
    refetch,
  };
};
