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

            // We need to join with campaigns to filter by status and account
            let query = supabase
                .from('metric_breakdowns')
                .select(`
          breakdown_type,
          breakdown_value,
          impressions,
          clicks,
          spend,
          conversions,
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
        `)
                .eq('campaigns.ad_accounts.integrations.user_id', user.id)
                .gte('date', dateFromStr)
                .lte('date', dateToStr);

            if (accountId) {
                query = query.eq('campaigns.ad_account_id', accountId);
            }

            if (status) {
                if (status === 'WITH_SPEND') {
                    query = query.gt('spend', 0);
                } else {
                    query = query.eq('campaigns.status', status);
                }
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching demographics:', error);
                throw error;
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
