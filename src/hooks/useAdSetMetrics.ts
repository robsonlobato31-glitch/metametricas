import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format } from 'date-fns';
import { useMemo } from 'react';

type AdSetMetricsData = {
    ad_set_id: string;
    ad_set_name: string;
    campaign_name: string;
    total_impressions: number;
    total_clicks: number;
    total_spend: number;
    total_conversions: number;
    avg_ctr: number;
    avg_cpc: number;
};

export const useAdSetMetrics = (dateFrom?: Date, dateTo?: Date, accountId?: string) => {
    const { user } = useAuth();

    const dateFromStr = useMemo(() =>
        format(dateFrom || subDays(new Date(), 30), 'yyyy-MM-dd'),
        [dateFrom]
    );

    const dateToStr = useMemo(() =>
        format(dateTo || new Date(), 'yyyy-MM-dd'),
        [dateTo]
    );

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['ad-set-metrics', user?.id, dateFromStr, dateToStr, accountId],
        queryFn: async () => {
            if (!user?.id) return [];

            console.log('[useAdSetMetrics] Fetching ad set metrics:', { user_id: user.id, dateFromStr, dateToStr, accountId });

            // Query to get ad set level metrics
            let query = supabase
                .from('metrics')
                .select(`
          ad_set_id,
          ad_sets!inner(
            ad_set_id,
            name,
            campaigns!inner(
              name,
              ad_account_id
            )
          ),
          impressions,
          clicks,
          spend,
          conversions,
          ctr,
          cpc
        `)
                .not('ad_set_id', 'is', null)
                .gte('date', dateFromStr)
                .lte('date', dateToStr);

            // Filter by account if provided
            if (accountId) {
                query = query.eq('ad_sets.campaigns.ad_account_id', accountId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[useAdSetMetrics] Error fetching metrics:', error);
                throw error;
            }

            // Aggregate metrics by ad set
            const aggregated = (data || []).reduce((acc: any[], curr: any) => {
                const existingAdSet = acc.find(item => item.ad_set_id === curr.ad_set_id);

                if (existingAdSet) {
                    existingAdSet.total_impressions += Number(curr.impressions || 0);
                    existingAdSet.total_clicks += Number(curr.clicks || 0);
                    existingAdSet.total_spend += Number(curr.spend || 0);
                    existingAdSet.total_conversions += Number(curr.conversions || 0);
                } else {
                    acc.push({
                        ad_set_id: curr.ad_set_id,
                        ad_set_name: curr.ad_sets?.name || 'Unknown',
                        campaign_name: curr.ad_sets?.campaigns?.name || 'Unknown',
                        total_impressions: Number(curr.impressions || 0),
                        total_clicks: Number(curr.clicks || 0),
                        total_spend: Number(curr.spend || 0),
                        total_conversions: Number(curr.conversions || 0),
                        avg_ctr: 0,
                        avg_cpc: 0,
                    });
                }

                return acc;
            }, []);

            // Calculate averages
            aggregated.forEach((adSet: any) => {
                adSet.avg_ctr = adSet.total_impressions > 0
                    ? (adSet.total_clicks / adSet.total_impressions) * 100
                    : 0;
                adSet.avg_cpc = adSet.total_clicks > 0
                    ? adSet.total_spend / adSet.total_clicks
                    : 0;
            });

            console.log('[useAdSetMetrics] Metrics fetched successfully:', aggregated);
            return aggregated as AdSetMetricsData[];
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
        gcTime: 30 * 60 * 1000, // Garbage collection time - cache kept for 30 minutes
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
    });

    // Calculate totals across all ad sets
    const totals = data?.reduce(
        (acc, curr) => ({
            impressions: acc.impressions + Number(curr.total_impressions || 0),
            clicks: acc.clicks + Number(curr.total_clicks || 0),
            spend: acc.spend + Number(curr.total_spend || 0),
            conversions: acc.conversions + Number(curr.total_conversions || 0),
        }),
        {
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
        }
    );

    return {
        data,
        totals: totals || null,
        isLoading,
        error,
        refetch,
    };
};
