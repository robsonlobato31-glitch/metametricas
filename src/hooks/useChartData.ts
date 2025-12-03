import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, eachDayOfInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartDataPoint {
  name: string;
  value: number;
}

interface UseChartDataOptions {
  dateFrom?: Date;
  dateTo?: Date;
}

export const useChartData = (options?: UseChartDataOptions) => {
  const { user } = useAuth();
  
  // Default: últimos 7 dias
  const today = new Date();
  const defaultDateFrom = subDays(today, 6);
  const dateFrom = options?.dateFrom || defaultDateFrom;
  const dateTo = options?.dateTo || today;

  const { data, isLoading, error } = useQuery({
    queryKey: ['chart-data', user?.id, format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd')],
    queryFn: async () => {
      const daysInRange = eachDayOfInterval({ start: dateFrom, end: dateTo });
      
      // Estrutura padrão com 0 para cada dia
      const emptyChart: ChartDataPoint[] = daysInRange.map(day => ({
        name: format(day, 'dd/MM', { locale: ptBR }),
        value: 0,
      }));

      if (!user?.id) return emptyChart;

      // Usar a função RPC para buscar métricas agregadas
      const { data: metrics, error: metricsError } = await supabase
        .rpc('get_chart_metrics', {
          p_user_id: user.id,
          p_date_from: format(dateFrom, 'yyyy-MM-dd'),
          p_date_to: format(dateTo, 'yyyy-MM-dd'),
        });

      if (metricsError) {
        console.error('Error fetching chart metrics:', metricsError);
        throw metricsError;
      }

      // Mapear as métricas por data
      const metricsMap = new Map<string, number>();
      if (metrics) {
        metrics.forEach((m: { metric_date: string; total_spend: number }) => {
          metricsMap.set(m.metric_date, Number(m.total_spend) || 0);
        });
      }

      // Construir os dados do gráfico com todos os dias
      const chartData: ChartDataPoint[] = daysInRange.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const spend = metricsMap.get(dayStr) || 0;
        
        return {
          name: format(day, 'dd/MM', { locale: ptBR }),
          value: spend,
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
