import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
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
      if (!user?.id) return [];

      // Últimos 7 dias
      const today = new Date();
      const weekStart = startOfWeek(today, { locale: ptBR });
      const weekEnd = endOfWeek(today, { locale: ptBR });
      
      // Buscar todas as campanhas do usuário
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, ad_account_id, ad_accounts!inner(integration_id, integrations!inner(user_id))')
        .eq('ad_accounts.integrations.user_id', user.id);

      if (campaignsError) throw campaignsError;
      if (!campaigns || campaigns.length === 0) return [];

      const campaignIds = campaigns.map(c => c.id);

      // Buscar métricas da semana
      const { data: metrics, error: metricsError } = await supabase
        .from('metrics')
        .select('date, spend, clicks, impressions, conversions')
        .in('campaign_id', campaignIds)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date');

      if (metricsError) throw metricsError;

      // Agrupar por dia da semana
      const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      const chartData: ChartDataPoint[] = daysOfWeek.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayMetrics = metrics?.filter(m => m.date === dayStr) || [];
        
        const totalSpend = dayMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
        
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
