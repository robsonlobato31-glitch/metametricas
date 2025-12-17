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
    mode: 'ads' | 'campaigns';
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
            if (!user?.id) return { creatives: [], needsSync: true, hasAdsData: false, mode: 'campaigns' };

            // Step 1: Get user's campaigns with filters
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

            if (campaignId) {
                campaignsQuery = campaignsQuery.eq('id', campaignId);
            }

            const { data: campaigns, error: campaignsError } = await campaignsQuery;

            if (campaignsError || !campaigns || campaigns.length === 0) {
                console.log('No campaigns found for user');
                return { creatives: [], needsSync: false, hasAdsData: false, mode: 'campaigns' };
            }

            const campaignIds = campaigns.map(c => c.id);
            const campaignsMap = new Map(campaigns.map(c => [c.id, c]));

            // Step 2: Get ads for these campaigns (via ad_sets)
            const { data: adSets } = await supabase
                .from('ad_sets')
                .select('id, campaign_id')
                .in('campaign_id', campaignIds);

            const adSetIds = (adSets || []).map(as => as.id);
            const adSetToCampaign = new Map((adSets || []).map(as => [as.id, as.campaign_id]));
            
            let ads: any[] = [];
            
            if (adSetIds.length > 0) {
                const { data: adsData } = await supabase
                    .from('ads')
                    .select('id, ad_id, name, creative_url, ad_set_id, status')
                    .in('ad_set_id', adSetIds);
                
                ads = adsData || [];
            }

            // If no ads exist, fallback to campaigns
            if (ads.length === 0) {
                return await getCampaignFallback(campaignIds, campaignsMap, dateFromStr, dateToStr, status);
            }

            // Step 3: Get campaign-level metrics (since ad_id in metrics table is always null)
            let metricsQuery = supabase
                .from('metrics')
                .select('campaign_id, spend, impressions, clicks, conversions, messages')
                .in('campaign_id', campaignIds)
                .gte('date', dateFromStr)
                .lte('date', dateToStr);

            if (status === 'WITH_SPEND') {
                metricsQuery = metricsQuery.gt('spend', 0);
            }

            const { data: metrics, error: metricsError } = await metricsQuery;

            if (metricsError || !metrics || metrics.length === 0) {
                return { creatives: [], needsSync: false, hasAdsData: true, mode: 'ads' };
            }

            // Step 4: Aggregate metrics by campaign
            const campaignMetrics: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; messages: number }> = {};
            
            for (const metric of metrics) {
                if (!metric.campaign_id) continue;
                
                if (!campaignMetrics[metric.campaign_id]) {
                    campaignMetrics[metric.campaign_id] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, messages: 0 };
                }
                
                campaignMetrics[metric.campaign_id].spend += Number(metric.spend || 0);
                campaignMetrics[metric.campaign_id].impressions += Number(metric.impressions || 0);
                campaignMetrics[metric.campaign_id].clicks += Number(metric.clicks || 0);
                campaignMetrics[metric.campaign_id].conversions += Number(metric.conversions || 0);
                campaignMetrics[metric.campaign_id].messages += Number(metric.messages || 0);
            }

            // Step 5: Distribute campaign metrics proportionally among ads
            // Group ads by campaign
            const adsByCampaign: Record<string, any[]> = {};
            for (const ad of ads) {
                const campaignId = adSetToCampaign.get(ad.ad_set_id);
                if (!campaignId) continue;
                
                if (!adsByCampaign[campaignId]) {
                    adsByCampaign[campaignId] = [];
                }
                adsByCampaign[campaignId].push(ad);
            }

            // Build creatives list with distributed metrics
            const creatives: CreativeMetric[] = [];

            for (const [cmpId, cmpAds] of Object.entries(adsByCampaign)) {
                const cmpMetric = campaignMetrics[cmpId];
                if (!cmpMetric) continue;

                // Distribute metrics equally among ads in the campaign
                const adCount = cmpAds.length;
                const perAdSpend = cmpMetric.spend / adCount;
                const perAdImpressions = Math.round(cmpMetric.impressions / adCount);
                const perAdClicks = Math.round(cmpMetric.clicks / adCount);
                const perAdConversions = Math.round(cmpMetric.conversions / adCount);
                const perAdMessages = Math.round(cmpMetric.messages / adCount);

                for (const ad of cmpAds) {
                    creatives.push({
                        ad_id: ad.ad_id,
                        ad_name: ad.name,
                        creative_url: ad.creative_url,
                        spend: perAdSpend,
                        impressions: perAdImpressions,
                        clicks: perAdClicks,
                        conversions: perAdConversions,
                        messages: perAdMessages,
                        ctr: perAdImpressions > 0 ? (perAdClicks / perAdImpressions) * 100 : 0,
                        cpc: perAdClicks > 0 ? perAdSpend / perAdClicks : 0,
                        cpa: perAdConversions > 0 ? perAdSpend / perAdConversions : 0,
                        roas: 0,
                        cost_per_message: perAdMessages > 0 ? perAdSpend / perAdMessages : 0,
                    });
                }
            }

            // Sort by spend and take top 5
            const topCreatives = creatives
                .sort((a, b) => b.spend - a.spend)
                .slice(0, 5);

            return { 
                creatives: topCreatives, 
                needsSync: false, 
                hasAdsData: true, 
                mode: 'ads' 
            };
        },
        enabled: !!user?.id,
    });
};

// Fallback function for campaign-level display
async function getCampaignFallback(
    campaignIds: string[],
    campaignsMap: Map<string, any>,
    dateFromStr: string,
    dateToStr: string,
    status?: string
): Promise<TopCreativesResult> {
    let campaignMetricsQuery = supabase
        .from('metrics')
        .select('campaign_id, spend, impressions, clicks, conversions, messages')
        .in('campaign_id', campaignIds)
        .gte('date', dateFromStr)
        .lte('date', dateToStr);

    if (status === 'WITH_SPEND') {
        campaignMetricsQuery = campaignMetricsQuery.gt('spend', 0);
    }

    const { data: campaignMetrics, error: campaignMetricsError } = await campaignMetricsQuery;

    if (campaignMetricsError || !campaignMetrics || campaignMetrics.length === 0) {
        return { creatives: [], needsSync: true, hasAdsData: false, mode: 'campaigns' };
    }

    const campaignAggregated: Record<string, any> = {};

    for (const metric of campaignMetrics) {
        if (!metric.campaign_id) continue;

        const campaign = campaignsMap.get(metric.campaign_id);
        if (!campaign) continue;

        if (!campaignAggregated[metric.campaign_id]) {
            campaignAggregated[metric.campaign_id] = {
                ad_id: campaign.id,
                ad_name: campaign.name,
                creative_url: null,
                spend: 0,
                impressions: 0,
                clicks: 0,
                conversions: 0,
                messages: 0,
            };
        }

        campaignAggregated[metric.campaign_id].spend += Number(metric.spend || 0);
        campaignAggregated[metric.campaign_id].impressions += Number(metric.impressions || 0);
        campaignAggregated[metric.campaign_id].clicks += Number(metric.clicks || 0);
        campaignAggregated[metric.campaign_id].conversions += Number(metric.conversions || 0);
        campaignAggregated[metric.campaign_id].messages += Number(metric.messages || 0);
    }

    const creatives = Object.values(campaignAggregated)
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

    return { 
        creatives, 
        needsSync: true, 
        hasAdsData: false, 
        mode: 'campaigns' 
    };
}
