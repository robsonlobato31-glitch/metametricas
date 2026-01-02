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
                return { creatives: [], needsSync: false, hasAdsData: false };
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

            // If no ads exist, return empty state indicating sync is needed
            if (ads.length === 0) {
                return { creatives: [], needsSync: true, hasAdsData: false };
            }

            // Step 3: Get ad-level metrics first, fallback to campaign-level
            const adInternalIds = ads.map(a => a.id);
            
            // Buscar métricas por ad_id (métricas diretas de anúncios)
            let adMetricsQuery = supabase
                .from('metrics')
                .select('ad_id, campaign_id, spend, impressions, clicks, conversions, messages')
                .in('ad_id', adInternalIds)
                .gte('date', dateFromStr)
                .lte('date', dateToStr);

            if (status === 'WITH_SPEND') {
                adMetricsQuery = adMetricsQuery.gt('spend', 0);
            }

            const { data: adMetrics } = await adMetricsQuery;

            // Agregar métricas por anúncio
            const adMetricsMap: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; messages: number }> = {};
            
            if (adMetrics && adMetrics.length > 0) {
                for (const metric of adMetrics) {
                    if (!metric.ad_id) continue;
                    
                    if (!adMetricsMap[metric.ad_id]) {
                        adMetricsMap[metric.ad_id] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, messages: 0 };
                    }
                    
                    adMetricsMap[metric.ad_id].spend += Number(metric.spend || 0);
                    adMetricsMap[metric.ad_id].impressions += Number(metric.impressions || 0);
                    adMetricsMap[metric.ad_id].clicks += Number(metric.clicks || 0);
                    adMetricsMap[metric.ad_id].conversions += Number(metric.conversions || 0);
                    adMetricsMap[metric.ad_id].messages += Number(metric.messages || 0);
                }
            }

            // Verificar se temos métricas por anúncio
            const hasAdLevelMetrics = Object.keys(adMetricsMap).length > 0;

            // Build creatives list com métricas diretas dos anúncios
            const creatives: CreativeMetric[] = [];

            if (hasAdLevelMetrics) {
                // Usar métricas diretas por anúncio
                for (const ad of ads) {
                    const adMetric = adMetricsMap[ad.id];
                    if (!adMetric) continue; // Pular anúncios sem métricas

                    creatives.push({
                        ad_id: ad.ad_id,
                        ad_name: ad.name,
                        creative_url: ad.creative_url,
                        spend: adMetric.spend,
                        impressions: adMetric.impressions,
                        clicks: adMetric.clicks,
                        conversions: adMetric.conversions,
                        messages: adMetric.messages,
                        ctr: adMetric.impressions > 0 ? (adMetric.clicks / adMetric.impressions) * 100 : 0,
                        cpc: adMetric.clicks > 0 ? adMetric.spend / adMetric.clicks : 0,
                        cpa: adMetric.conversions > 0 ? adMetric.spend / adMetric.conversions : 0,
                        roas: 0,
                        cost_per_message: adMetric.messages > 0 ? adMetric.spend / adMetric.messages : 0,
                    });
                }
            } else {
                // Fallback: métricas de campanha (quando ad_id é null)
                let campaignMetricsQuery = supabase
                    .from('metrics')
                    .select('campaign_id, spend, impressions, clicks, conversions, messages')
                    .in('campaign_id', campaignIds)
                    .is('ad_id', null)
                    .gte('date', dateFromStr)
                    .lte('date', dateToStr);

                if (status === 'WITH_SPEND') {
                    campaignMetricsQuery = campaignMetricsQuery.gt('spend', 0);
                }

                const { data: campaignMetrics } = await campaignMetricsQuery;

                if (!campaignMetrics || campaignMetrics.length === 0) {
                    return { creatives: [], needsSync: true, hasAdsData: true };
                }

                // Agregar métricas por campanha
                const campaignMetricsAgg: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; messages: number }> = {};
                
                for (const metric of campaignMetrics) {
                    if (!metric.campaign_id) continue;
                    
                    if (!campaignMetricsAgg[metric.campaign_id]) {
                        campaignMetricsAgg[metric.campaign_id] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, messages: 0 };
                    }
                    
                    campaignMetricsAgg[metric.campaign_id].spend += Number(metric.spend || 0);
                    campaignMetricsAgg[metric.campaign_id].impressions += Number(metric.impressions || 0);
                    campaignMetricsAgg[metric.campaign_id].clicks += Number(metric.clicks || 0);
                    campaignMetricsAgg[metric.campaign_id].conversions += Number(metric.conversions || 0);
                    campaignMetricsAgg[metric.campaign_id].messages += Number(metric.messages || 0);
                }

                // Mostrar mensagem indicando que precisa sincronizar para ter métricas por anúncio
                return { creatives: [], needsSync: true, hasAdsData: true };
            }

            // Sort by spend and take top 5
            const topCreatives = creatives
                .sort((a, b) => b.spend - a.spend)
                .slice(0, 5);

            return { 
                creatives: topCreatives, 
                needsSync: false, 
                hasAdsData: true 
            };
        },
        enabled: !!user?.id,
    });
};
