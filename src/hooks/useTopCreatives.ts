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

            // Primeiro, buscar campanhas do usuário
            let campaignsQuery = supabase
                .from('campaigns')
                .select(`
                    id,
                    status,
                    ad_account_id,
                    ad_accounts!inner(
                        id,
                        integration_id,
                        integrations!inner(user_id)
                    )
                `)
                .eq('ad_accounts.integrations.user_id', user.id);

            if (accountId) {
                campaignsQuery = campaignsQuery.eq('ad_account_id', accountId);
            }

            if (status && status !== 'WITH_SPEND') {
                campaignsQuery = campaignsQuery.eq('status', status);
            }

            const { data: campaigns, error: campaignsError } = await campaignsQuery;

            if (campaignsError || !campaigns || campaigns.length === 0) {
                console.log('No campaigns found for top creatives');
                return [];
            }

            const campaignIds = campaigns.map(c => c.id);

            // Buscar ad_sets dessas campanhas
            const { data: adSets, error: adSetsError } = await supabase
                .from('ad_sets')
                .select('id, campaign_id')
                .in('campaign_id', campaignIds);

            if (adSetsError || !adSets || adSets.length === 0) {
                console.log('No ad sets found for top creatives');
                return [];
            }

            const adSetIds = adSets.map(as => as.id);

            // Buscar ads desses ad_sets
            const { data: ads, error: adsError } = await supabase
                .from('ads')
                .select('id, name, creative_url, ad_set_id')
                .in('ad_set_id', adSetIds);

            if (adsError || !ads || ads.length === 0) {
                console.log('No ads found for top creatives');
                return [];
            }

            const adIds = ads.map(a => a.id);

            // Buscar métricas desses ads
            let metricsQuery = supabase
                .from('metrics')
                .select('ad_id, spend, impressions, clicks, conversions, messages')
                .in('ad_id', adIds)
                .gte('date', dateFromStr)
                .lte('date', dateToStr);

            // Se status é WITH_SPEND, filtrar por spend > 0
            if (status === 'WITH_SPEND') {
                metricsQuery = metricsQuery.gt('spend', 0);
            }

            const { data: metrics, error: metricsError } = await metricsQuery;

            if (metricsError) {
                console.error('Error fetching metrics for top creatives:', metricsError);
                throw metricsError;
            }

            if (!metrics || metrics.length === 0) {
                console.log('No metrics found for ads');
                return [];
            }

            // Criar mapa de ads
            const adsMap = new Map(ads.map(a => [a.id, a]));

            // Aggregate by Ad
            const aggregated: Record<string, any> = {};

            for (const metric of metrics) {
                if (!metric.ad_id) continue;
                
                const ad = adsMap.get(metric.ad_id);
                if (!ad) continue;

                if (!aggregated[metric.ad_id]) {
                    aggregated[metric.ad_id] = {
                        ad_id: metric.ad_id,
                        ad_name: ad.name,
                        creative_url: ad.creative_url,
                        spend: 0,
                        impressions: 0,
                        clicks: 0,
                        conversions: 0,
                        messages: 0,
                    };
                }

                aggregated[metric.ad_id].spend += Number(metric.spend || 0);
                aggregated[metric.ad_id].impressions += Number(metric.impressions || 0);
                aggregated[metric.ad_id].clicks += Number(metric.clicks || 0);
                aggregated[metric.ad_id].conversions += Number(metric.conversions || 0);
                aggregated[metric.ad_id].messages += Number(metric.messages || 0);
            }

            // Calculate derived metrics and sort
            return Object.values(aggregated)
                .map((ad: any) => ({
                    ...ad,
                    ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
                    cpc: ad.clicks > 0 ? ad.spend / ad.clicks : 0,
                    cpa: ad.conversions > 0 ? ad.spend / ad.conversions : 0,
                    roas: 0,
                    cost_per_message: ad.messages > 0 ? ad.spend / ad.messages : 0,
                }))
                .sort((a: any, b: any) => b.spend - a.spend)
                .slice(0, 5); // Top 5
        },
        enabled: !!user?.id,
    });
};