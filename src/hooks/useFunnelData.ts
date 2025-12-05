import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface FunnelMetrics {
  impressions: number;
  linkClicks: number;
  pageViews: number;
  initiatedCheckout: number;
  purchases: number;
}

interface UseFunnelDataParams {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  provider?: string | null;
}

export function useFunnelData({ dateFrom, dateTo, provider }: UseFunnelDataParams) {
  return useQuery({
    queryKey: ['funnel-metrics', dateFrom?.toISOString(), dateTo?.toISOString(), provider],
    queryFn: async (): Promise<FunnelMetrics> => {
      if (!dateFrom || !dateTo) {
        return { impressions: 0, linkClicks: 0, pageViews: 0, initiatedCheckout: 0, purchases: 0 };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { impressions: 0, linkClicks: 0, pageViews: 0, initiatedCheckout: 0, purchases: 0 };
      }

      const { data, error } = await supabase.rpc('get_funnel_metrics', {
        p_user_id: user.id,
        p_date_from: format(dateFrom, 'yyyy-MM-dd'),
        p_date_to: format(dateTo, 'yyyy-MM-dd'),
        p_provider: provider || null,
      });

      if (error) {
        console.error('[useFunnelData] Error fetching funnel metrics:', error);
        throw error;
      }

      const row = data?.[0] || {};
      return {
        impressions: Number(row.total_impressions) || 0,
        linkClicks: Number(row.total_link_clicks) || 0,
        pageViews: Number(row.total_page_views) || 0,
        initiatedCheckout: Number(row.total_initiated_checkout) || 0,
        purchases: Number(row.total_purchases) || 0,
      };
    },
    enabled: !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
