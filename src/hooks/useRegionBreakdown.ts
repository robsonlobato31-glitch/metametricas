import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

export interface RegionMetric {
  breakdown_value: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export const useRegionBreakdown = (
  dateFrom?: Date,
  dateTo?: Date,
  accountId?: string,
  status?: string
) => {
  const { user } = useAuth();

  const dateFromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const dateToStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['region-breakdown', user?.id, dateFromStr, dateToStr, accountId, status],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar as campanhas do usuário com os filtros aplicados
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
        console.error('Error fetching campaigns for region breakdown:', campaignsError);
        throw campaignsError;
      }

      if (!campaigns || campaigns.length === 0) {
        return [];
      }

      const campaignIds = campaigns.map(c => c.id);

      // Buscar os breakdowns de região para essas campanhas
      let breakdownsQuery = supabase
        .from('metric_breakdowns')
        .select('breakdown_type, breakdown_value, impressions, clicks, spend, conversions')
        .in('campaign_id', campaignIds)
        .eq('breakdown_type', 'region')
        .gte('date', dateFromStr)
        .lte('date', dateToStr);

      // Se status é WITH_SPEND, filtrar por spend > 0
      if (status === 'WITH_SPEND') {
        breakdownsQuery = breakdownsQuery.gt('spend', 0);
      }

      const { data, error } = await breakdownsQuery;

      if (error) {
        console.error('Error fetching region breakdowns:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Agregar dados por região
      const aggregated = data.reduce((acc: Record<string, RegionMetric>, curr) => {
        const value = curr.breakdown_value;

        if (!acc[value]) {
          acc[value] = {
            breakdown_value: value,
            impressions: 0,
            clicks: 0,
            spend: 0,
            conversions: 0,
          };
        }

        acc[value].impressions += Number(curr.impressions || 0);
        acc[value].clicks += Number(curr.clicks || 0);
        acc[value].spend += Number(curr.spend || 0);
        acc[value].conversions += Number(curr.conversions || 0);

        return acc;
      }, {});

      // Converter para array e ordenar por impressões
      const regions = Object.values(aggregated)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10); // Top 10 regiões

      return regions;
    },
    enabled: !!user?.id,
  });
};
