import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

export interface DemographicMetric {
    breakdown_value: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
}

export const useDemographics = (
    dateFrom?: Date,
    dateTo?: Date,
    accountId?: string,
    status?: string
) => {
    const { user } = useAuth();

    const dateFromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const dateToStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

    return useQuery({
        queryKey: ['demographics', user?.id, dateFromStr, dateToStr, accountId, status],
        queryFn: async () => {
            if (!user?.id) return { age: [], gender: [] };

            // Primeiro, buscar as campanhas do usuário com os filtros aplicados
            let campaignsQuery = supabase
                .from('campaigns')
                .select(`
                    id,
                    status,
                    ad_account_id,
                    ad_accounts!inner(
                        id,
                        integration_id,
                        integrations!inner(
                            user_id
                        )
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

            if (campaignsError) {
                console.error('Error fetching campaigns for demographics:', campaignsError);
                throw campaignsError;
            }

            if (!campaigns || campaigns.length === 0) {
                return { age: [], gender: [] };
            }

            const campaignIds = campaigns.map(c => c.id);

            // Agora buscar os breakdowns para essas campanhas
            let breakdownsQuery = supabase
                .from('metric_breakdowns')
                .select('breakdown_type, breakdown_value, impressions, clicks, spend, conversions')
                .in('campaign_id', campaignIds)
                .gte('date', dateFromStr)
                .lte('date', dateToStr);

            // Se status é WITH_SPEND, filtrar por spend > 0
            if (status === 'WITH_SPEND') {
                breakdownsQuery = breakdownsQuery.gt('spend', 0);
            }

            const { data, error } = await breakdownsQuery;

            if (error) {
                console.error('Error fetching demographics:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                return { age: [], gender: [] };
            }

            // Aggregate data by type and value
            const aggregated = data.reduce((acc: any, curr: any) => {
                const type = curr.breakdown_type;
                const value = curr.breakdown_value;

                if (!acc[type]) acc[type] = {};
                if (!acc[type][value]) {
                    acc[type][value] = {
                        breakdown_value: value,
                        impressions: 0,
                        clicks: 0,
                        spend: 0,
                        conversions: 0,
                    };
                }

                acc[type][value].impressions += Number(curr.impressions || 0);
                acc[type][value].clicks += Number(curr.clicks || 0);
                acc[type][value].spend += Number(curr.spend || 0);
                acc[type][value].conversions += Number(curr.conversions || 0);

                return acc;
            }, {});

            // Convert to arrays
            const age = Object.values(aggregated.age || {}).sort((a: any, b: any) => b.impressions - a.impressions);
            const gender = Object.values(aggregated.gender || {}).sort((a: any, b: any) => b.impressions - a.impressions);

            return { age, gender };
        },
        enabled: !!user?.id,
    });
};