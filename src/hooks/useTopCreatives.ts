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

            // Build campaigns query with filters
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

            const { data: campaigns, error: campaignsError } = await campaignsQuery;

            if (campaignsError || !campaigns || campaigns.length === 0) {
                console.log('No campaigns found for top creatives');
                return [];
            }

            const campaignIds = campaigns.map(c => c.id);
            const campaignMap = new Map(campaigns.map(c => [c.id, c]));

            // Query metrics aggregated by campaign (since ads table is empty)
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

            if (metricsError) {
                console.error('Error fetching metrics for top creatives:', metricsError);
                throw metricsError;
            }

            if (!metrics || metrics.length === 0) {
                console.log('No metrics found for campaigns');
                return [];
            }

            // Aggregate by campaign (using campaign as "creative" since ads table is empty)
            const aggregated: Record<string, any> = {};

            for (const metric of metrics) {
                if (!metric.campaign_id) continue;
                
                const campaign = campaignMap.get(metric.campaign_id);
                if (!campaign) continue;

                if (!aggregated[metric.campaign_id]) {
                    aggregated[metric.campaign_id] = {
                        ad_id: metric.campaign_id,
                        ad_name: campaign.name,
                        creative_url: null,
                        spend: 0,
                        impressions: 0,
                        clicks: 0,
                        conversions: 0,
                        messages: 0,
                    };
                }

                aggregated[metric.campaign_id].spend += Number(metric.spend || 0);
                aggregated[metric.campaign_id].impressions += Number(metric.impressions || 0);
                aggregated[metric.campaign_id].clicks += Number(metric.clicks || 0);
                aggregated[metric.campaign_id].conversions += Number(metric.conversions || 0);
                aggregated[metric.campaign_id].messages += Number(metric.messages || 0);
            }

            // Calculate derived metrics and sort
            return Object.values(aggregated)
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
        },
        enabled: !!user?.id,
    });
};