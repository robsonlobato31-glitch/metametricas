import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, eachDayOfInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartDataPoint {
  name: string;
  value: number;
}

export const useChartData = () => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['chart-data', user?.id],
    queryFn: async () => {
      // Últimos 7 dias (hoje e os 6 dias anteriores)
      const today = new Date();
      const sevenDaysAgo = subDays(today, 6);
      const daysOfWeek = eachDayOfInterval({ start: sevenDaysAgo, end: today });
      
      // Estrutura padrão com 0 para cada dia
      const emptyChart: ChartDataPoint[] = daysOfWeek.map(day => ({
        name: format(day, 'EEE', { locale: ptBR }),
        value: 0,
      }));

      if (!user?.id) return emptyChart;

      // Step 1: Buscar integrations do usuário
      const { data: integrations, error: intError } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', user.id);

      if (intError) throw intError;
      if (!integrations || integrations.length === 0) return emptyChart;

      const integrationIds = integrations.map(i => i.id);

      // Step 2: Buscar ad_accounts dessas integrations
      const { data: adAccounts, error: aaError } = await supabase
        .from('ad_accounts')
        .select('id')
        .in('integration_id', integrationIds);

      if (aaError) throw aaError;
      if (!adAccounts || adAccounts.length === 0) return emptyChart;

      const adAccountIds = adAccounts.map(aa => aa.id);

      // Step 3: Buscar campaigns dessas ad_accounts
      const { data: campaigns, error: campError } = await supabase
        .from('campaigns')
        .select('id')
        .in('ad_account_id', adAccountIds);

      if (campError) throw campError;
      if (!campaigns || campaigns.length === 0) return emptyChart;

      const campaignIds = campaigns.map(c => c.id);

      // Step 4: Buscar métricas dos últimos 7 dias
      const { data: metrics, error: metricsError } = await supabase
        .from('metrics')
        .select('date, spend')
        .in('campaign_id', campaignIds)
        .gte('date', format(sevenDaysAgo, 'yyyy-MM-dd'))
        .lte('date', format(today, 'yyyy-MM-dd'))
        .order('date');

      if (metricsError) throw metricsError;

      // Agrupar por dia
      const chartData: ChartDataPoint[] = daysOfWeek.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayMetrics = metrics?.filter(m => m.date === dayStr) || [];
        
        const totalSpend = dayMetrics.reduce((sum, m) => sum + (Number(m.spend) || 0), 0);
        
        return {
          name: format(day, 'EEE', { locale: ptBR }),
          value: totalSpend,
        };
      });

      return chartData;
    },
    enabled: !!user?.id,
  });

  return {
    data: data || [],
    isLoading,
    error,
  };
};
