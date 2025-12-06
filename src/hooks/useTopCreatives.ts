import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

export interface CreativeMetric {
    ad_id: string;
    ad_name: string;
    creative_url: string | null;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
    messages: number;
    cost_per_message: number;
}

export const useTopCreatives = (
    dateFrom?: Date,
    dateTo?: Date,
    accountId?: string,
    status?: string
) => {
    const { user } = useAuth();

    const dateFromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const dateToStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

    return useQuery({
        queryKey: ['top-creatives', user?.id, dateFromStr, dateToStr, accountId, status],
        queryFn: async () => {
            if (!user?.id) return [];

            // We need to join metrics -> ads -> ad_sets -> campaigns
            // Note: This assumes metrics are populated with ad_id
            let query = supabase
                .from('metrics')
                .select(`
          spend,
          impressions,
          clicks,
          conversions,
          messages,
          ads!inner(
            id,
            name,
            creative_url,
            ad_sets!inner(
              campaigns!inner(
                id,
                status,
                ad_account_id,
                ad_accounts!inner(
                  integration_id,
                  integrations!inner(
                    user_id
                  )
                )
              )
            )
          )
        `)
                .eq('ads.ad_sets.campaigns.ad_accounts.integrations.user_id', user.id)
                .gte('date', dateFromStr)
                .lte('date', dateToStr);

            if (accountId) {
                query = query.eq('ads.ad_sets.campaigns.ad_account_id', accountId);
            }

            if (status) {
                if (status === 'WITH_SPEND') {
                    query = query.gt('spend', 0);
                } else {
                    query = query.eq('ads.ad_sets.campaigns.status', status);
                }
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching top creatives:', error);
                throw error;
            }

            // Aggregate by Ad
            const aggregated = data.reduce((acc: any, curr: any) => {
                const adId = curr.ads.id;

                if (!acc[adId]) {
                    acc[adId] = {
                        ad_id: adId,
                        ad_name: curr.ads.name,
                        creative_url: curr.ads.creative_url,
                        spend: 0,
                        impressions: 0,
                        clicks: 0,
                        conversions: 0,
                        messages: 0,
                        cost_per_message: 0,
                    };
                }

                acc[adId].spend += Number(curr.spend || 0);
                acc[adId].impressions += Number(curr.impressions || 0);
                acc[adId].clicks += Number(curr.clicks || 0);
                acc[adId].conversions += Number(curr.conversions || 0);
                acc[adId].messages += Number(curr.messages || 0);

                return acc;
            }, {});

            // Calculate derived metrics and sort
            return Object.values(aggregated)
                .map((ad: any) => ({
                    ...ad,
                    ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
                    cpc: ad.clicks > 0 ? ad.spend / ad.clicks : 0,
                    cpa: ad.conversions > 0 ? ad.spend / ad.conversions : 0,
                    roas: 0, // Revenue not yet available in metrics table join
                    messages: ad.messages,
                    cost_per_message: ad.messages > 0 ? ad.spend / ad.messages : 0,
                }))
                .sort((a: any, b: any) => b.spend - a.spend)
                .slice(0, 5); // Top 5
        },
        enabled: !!user?.id,
    });
};
