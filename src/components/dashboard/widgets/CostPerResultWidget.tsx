import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { useMetrics } from '@/hooks/useMetrics';
import { subDays } from 'date-fns';

export const CostPerResultWidget = () => {
  const { totals, isLoading } = useMetrics(subDays(new Date(), 30), new Date());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Custo por Resultado</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-2xl font-bold animate-pulse">-</div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {totals ? formatCurrency(totals.cost_per_result) : 'R$ 0,00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimos 30 dias
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
