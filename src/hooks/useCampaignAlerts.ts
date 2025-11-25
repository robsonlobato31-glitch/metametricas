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
  };
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
            ad_accounts!inner(
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

      return (data || []) as unknown as CampaignAlertWithDetails[];
    },
    enabled: !!user?.id,
  });

  // Calculate percentage for each alert
  const alertsWithPercentage = alerts?.map((alert) => ({
    ...alert,
    percentage: (alert.current_amount / alert.threshold_amount) * 100,
  }));

  return {
    alerts: alertsWithPercentage || [],
    isLoading,
    error,
    refetch,
  };
};
