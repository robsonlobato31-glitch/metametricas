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

            // Etapa 1: Buscar integrações do usuário
            const { data: integrations, error: integrationsError } = await supabase
                .from('integrations')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'active');

            if (integrationsError) {
                console.error('Error fetching integrations:', integrationsError);
                throw integrationsError;
            }

            if (!integrations || integrations.length === 0) {
                return { age: [], gender: [] };
            }

            const integrationIds = integrations.map(i => i.id);

            // Etapa 2: Buscar as contas de anúncio das integrações do usuário
            let accountsQuery = supabase
                .from('ad_accounts')
                .select('id')
                .in('integration_id', integrationIds)
                .eq('is_active', true);

            const { data: accounts, error: accountsError } = await accountsQuery;

            if (accountsError) {
                console.error('Error fetching ad accounts:', accountsError);
                throw accountsError;
            }

            if (!accounts || accounts.length === 0) {
                return { age: [], gender: [] };
            }

            // Filtrar por conta específica se fornecido
            let accountIds = accounts.map(a => a.id);
            if (accountId) {
                accountIds = accountIds.filter(id => id === accountId);
            }

            if (accountIds.length === 0) {
                return { age: [], gender: [] };
            }

            // Etapa 3: Buscar campanhas dessas contas
            let campaignsQuery = supabase
                .from('campaigns')
                .select('id, status, ad_account_id')
                .in('ad_account_id', accountIds);

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

            // Etapa 4: Buscar os breakdowns demográficos para essas campanhas
            let breakdownsQuery = supabase
                .from('metric_breakdowns')
                .select('breakdown_type, breakdown_value, impressions, clicks, spend, conversions')
                .in('campaign_id', campaignIds)
                .in('breakdown_type', ['age', 'gender'])
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
