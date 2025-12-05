import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TimelineDataPoint {
  date: string;
  spend: number;
  revenue: number;
}

interface UseTimelineDataParams {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  provider?: string | null;
}

export function useTimelineData({ dateFrom, dateTo, provider }: UseTimelineDataParams) {
  return useQuery({
    queryKey: ['timeline-metrics', dateFrom?.toISOString(), dateTo?.toISOString(), provider],
    queryFn: async (): Promise<TimelineDataPoint[]> => {
      if (!dateFrom || !dateTo) return [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_timeline_metrics', {
        p_user_id: user.id,
        p_date_from: format(dateFrom, 'yyyy-MM-dd'),
        p_date_to: format(dateTo, 'yyyy-MM-dd'),
        p_provider: provider || null,
      });

      if (error) {
        console.error('[useTimelineData] Error fetching timeline metrics:', error);
        throw error;
      }

      return (data || []).map((row: { metric_date: string; total_spend: number; total_revenue: number }) => ({
        date: format(new Date(row.metric_date), 'dd/MM'),
        spend: Number(row.total_spend) || 0,
        revenue: Number(row.total_revenue) || 0,
      }));
    },
    enabled: !!dateFrom && !!dateTo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
