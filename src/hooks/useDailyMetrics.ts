import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

export interface DailyMetric {
    date: string;
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    conversions: number;
}

export const useDailyMetrics = (dateFrom?: Date, dateTo?: Date, accountId?: string, status?: string) => {
    const { user } = useAuth();

    const dateFromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const dateToStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

    const { data, isLoading, error } = useQuery({
        queryKey: ['daily-metrics', user?.id, dateFromStr, dateToStr, accountId, status],
        queryFn: async () => {
            if (!user?.id) return [];

            // Use get_timeline_metrics which already exists
            const { data, error } = await (supabase.rpc as any)('get_timeline_metrics', {
                p_user_id: user.id,
                p_date_from: dateFromStr,
                p_date_to: dateToStr,
                p_provider: undefined
            });

            if (error) {
                console.error('[useDailyMetrics] Error fetching daily metrics:', error);
                throw error;
            }

            // Map to expected format
            return (data || []).map((d: any) => ({
                date: d.metric_date,
                spend: Number(d.total_spend || 0),
                revenue: Number(d.total_revenue || 0),
                impressions: 0,
                clicks: 0,
                conversions: 0
            })) as DailyMetric[];
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    return {
        data: data || [],
        isLoading,
        error,
    };
};
