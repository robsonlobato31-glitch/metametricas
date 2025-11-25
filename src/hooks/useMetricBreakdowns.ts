import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type BreakdownType = 'age' | 'gender' | 'device_platform' | 'publisher_platform';

export interface MetricBreakdown {
  id: string;
  campaign_id: string;
  date: string;
  breakdown_type: BreakdownType;
  breakdown_value: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  results: number;
  messages: number;
  ctr: number | null;
  cpc: number | null;
  cost_per_result: number | null;
  cost_per_message: number | null;
}

interface BreakdownFilters {
  dateFrom?: Date;
  dateTo?: Date;
  breakdownType?: BreakdownType;
  campaignId?: string;
}

export const useMetricBreakdowns = (filters?: BreakdownFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['metric-breakdowns', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('metric_breakdowns')
        .select(`
          *,
          campaigns!inner(
            id,
            name,
            ad_accounts!inner(
              integrations!inner(user_id)
            )
          )
        `)
        .eq('campaigns.ad_accounts.integrations.user_id', user.id);

      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom.toISOString().split('T')[0]);
      }

      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo.toISOString().split('T')[0]);
      }

      if (filters?.breakdownType) {
        query = query.eq('breakdown_type', filters.breakdownType);
      }

      if (filters?.campaignId) {
        query = query.eq('campaign_id', filters.campaignId);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data as MetricBreakdown[];
    },
    enabled: !!user?.id,
  });
};
