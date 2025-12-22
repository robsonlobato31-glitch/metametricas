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

export interface RegionBreakdownResult {
  regions: RegionMetric[];
  hasData: boolean;
  needsSync: boolean;
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
    queryFn: async (): Promise<RegionBreakdownResult> => {
      if (!user?.id) return { regions: [], hasData: false, needsSync: false };

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
        return { regions: [], hasData: false, needsSync: false };
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
        return { regions: [], hasData: false, needsSync: false };
      }

      // Filtrar por conta específica se fornecido
      let accountIds = accounts.map(a => a.id);
      if (accountId) {
        accountIds = accountIds.filter(id => id === accountId);
      }

      if (accountIds.length === 0) {
        return { regions: [], hasData: false, needsSync: false };
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
        console.error('Error fetching campaigns for region breakdown:', campaignsError);
        throw campaignsError;
      }

      if (!campaigns || campaigns.length === 0) {
        return { regions: [], hasData: false, needsSync: false };
      }

      const campaignIds = campaigns.map(c => c.id);

      // Verificar se há métricas (para determinar se needsSync)
      const { count: metricsCount } = await supabase
        .from('metrics')
        .select('id', { count: 'exact', head: true })
        .in('campaign_id', campaignIds)
        .gte('date', dateFromStr)
        .lte('date', dateToStr);

      const hasMetrics = (metricsCount || 0) > 0;

      // Etapa 4: Buscar os breakdowns de região para essas campanhas
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
        return { regions: [], hasData: false, needsSync: hasMetrics };
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

      return { regions, hasData: true, needsSync: false };
    },
    enabled: !!user?.id,
  });
};
