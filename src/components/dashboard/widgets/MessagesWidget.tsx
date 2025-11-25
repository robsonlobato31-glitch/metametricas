import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useMetrics } from '@/hooks/useMetrics';
import { subDays } from 'date-fns';

export const MessagesWidget = () => {
  const { totals, isLoading } = useMetrics(subDays(new Date(), 30), new Date());

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-2xl font-bold animate-pulse">-</div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {totals ? formatNumber(totals.messages) : 0}
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
