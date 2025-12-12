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

export interface TopCreativesResult {
    creatives: CreativeMetric[];
    needsSync: boolean;
    hasAdsData: boolean;
}

export const useTopCreatives = (
    dateFrom?: Date,
    dateTo?: Date,
    accountId?: string,
    status?: string,
    campaignId?: string
) => {
    const { user } = useAuth();

    const dateFromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const dateToStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

    return useQuery({
        queryKey: ['top-creatives', user?.id, dateFromStr, dateToStr, accountId, status, campaignId],
        queryFn: async (): Promise<TopCreativesResult> => {
            if (!user?.id) return { creatives: [], needsSync: true, hasAdsData: false };

            // Step 1: Check if we have ads data
            const { count: adsCount } = await supabase
                .from('ads')
                .select('id', { count: 'exact', head: true });

            if (!adsCount || adsCount === 0) {
                console.log('No ads data found - sync required');
                return { creatives: [], needsSync: true, hasAdsData: false };
            }

            // Step 2: Get user's campaigns with filters
            let campaignsQuery = supabase
                .from('campaigns')
                .select(`
                    id,
                    name,
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

            // Filter by campaign if specified
            if (campaignId) {
                campaignsQuery = campaignsQuery.eq('id', campaignId);
            }

            const { data: campaigns, error: campaignsError } = await campaignsQuery;

            if (campaignsError || !campaigns || campaigns.length === 0) {
                console.log('No campaigns found for user');
                return { creatives: [], needsSync: false, hasAdsData: true };
            }

            const campaignIds = campaigns.map(c => c.id);

            // Step 3: Get ad_sets for these campaigns
            const { data: adSets, error: adSetsError } = await supabase
                .from('ad_sets')
                .select('id, campaign_id')
                .in('campaign_id', campaignIds);

            if (adSetsError || !adSets || adSets.length === 0) {
                console.log('No ad sets found for campaigns');
                return { creatives: [], needsSync: true, hasAdsData: false };
            }

            const adSetIds = adSets.map(as => as.id);

            // Step 4: Get ads for these ad_sets
            const { data: ads, error: adsError } = await supabase
                .from('ads')
                .select('id, ad_id, name, creative_url, ad_set_id')
                .in('ad_set_id', adSetIds);

            if (adsError || !ads || ads.length === 0) {
                console.log('No ads found for ad sets');
                return { creatives: [], needsSync: true, hasAdsData: false };
            }

            const adIds = ads.map(a => a.id);
            const adsMap = new Map(ads.map(a => [a.id, a]));

            // Step 5: Get metrics for these ads
            let metricsQuery = supabase
                .from('metrics')
                .select('ad_id, spend, impressions, clicks, conversions, messages')
                .in('ad_id', adIds)
                .gte('date', dateFromStr)
                .lte('date', dateToStr);

            if (status === 'WITH_SPEND') {
                metricsQuery = metricsQuery.gt('spend', 0);
            }

            const { data: metrics, error: metricsError } = await metricsQuery;

            if (metricsError) {
                console.error('Error fetching metrics for ads:', metricsError);
                throw metricsError;
            }

            if (!metrics || metrics.length === 0) {
                console.log('No metrics found for ads - may need metrics sync');
                return { creatives: [], needsSync: false, hasAdsData: true };
            }

            // Step 6: Aggregate metrics by ad
            const aggregated: Record<string, any> = {};

            for (const metric of metrics) {
                if (!metric.ad_id) continue;

                const ad = adsMap.get(metric.ad_id);
                if (!ad) continue;

                if (!aggregated[metric.ad_id]) {
                    aggregated[metric.ad_id] = {
                        ad_id: ad.ad_id,
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

            // Step 7: Calculate derived metrics and sort
            const creatives = Object.values(aggregated)
                .map((item: any) => ({
                    ...item,
                    ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
                    cpc: item.clicks > 0 ? item.spend / item.clicks : 0,
                    cpa: item.conversions > 0 ? item.spend / item.conversions : 0,
                    roas: 0,
                    cost_per_message: item.messages > 0 ? item.spend / item.messages : 0,
                }))
                .sort((a: any, b: any) => b.spend - a.spend)
                .slice(0, 5);

            return { creatives, needsSync: false, hasAdsData: true };
        },
        enabled: !!user?.id,
    });
};