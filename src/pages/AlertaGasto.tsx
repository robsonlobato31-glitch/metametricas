import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCampaignAlerts } from '@/hooks/useCampaignAlerts';
import { useRealtimeAlertsContext } from '@/contexts/RealtimeAlertsContext';
import { BudgetMonitorButton } from '@/components/BudgetMonitorButton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AlertaGasto() {
  const { alerts, isLoading, refetch } = useCampaignAlerts();
  const { clearNewAlertsCount } = useRealtimeAlertsContext();

  // Clear new alerts count when component mounts
  useEffect(() => {
    clearNewAlertsCount();
  }, [clearNewAlertsCount]);

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 100) {
      return <Badge variant="destructive">Orçamento Excedido</Badge>;
    }
    if (percentage >= 95) {
      return <Badge variant="destructive">Crítico</Badge>;
    }
    return <Badge variant="default">Atenção</Badge>;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 95) return 'text-destructive';
    if (percentage >= 80) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alertas de Gasto</h1>
            <p className="text-muted-foreground mt-1">
              Monitore campanhas que estão próximas ou ultrapassaram o orçamento
            </p>
          </div>
          <div className="flex gap-2">
            <BudgetMonitorButton />
            <Button onClick={() => refetch()} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Alertas são gerados automaticamente quando uma campanha atinge 80% do orçamento configurado.
          </AlertDescription>
        </Alert>

        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                `${alerts.length} Alerta(s) Ativo(s)`
              )}
            </CardTitle>
            <CardDescription>
              Campanhas que requerem atenção imediata
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{alert.campaigns.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Orçamento: {formatCurrency(alert.threshold_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Disparado em:{' '}
                          {format(new Date(alert.triggered_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      {getStatusBadge(alert.percentage)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Gasto Atual</span>
                        <span className={`font-medium ${getStatusColor(alert.percentage)}`}>
                          {formatCurrency(alert.current_amount)} ({alert.percentage.toFixed(1)}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            alert.percentage >= 100
                              ? 'bg-destructive'
                              : alert.percentage >= 95
                              ? 'bg-destructive'
                              : alert.percentage >= 80
                              ? 'bg-yellow-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                        />
                      </div>

                      {alert.percentage >= 100 ? (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Orçamento excedido!</span>
                        </div>
                      ) : alert.percentage >= 95 ? (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Orçamento quase esgotado!</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum alerta ativo no momento. 🎉
              </p>
            )}
          </CardContent>
        </Card>

        {/* Configuration Info */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Alertas são criados automaticamente quando o gasto atinge 80% do orçamento</p>
            <p>• Você pode visualizar todos os alertas ativos nesta página</p>
            <p>• Notificações em tempo real serão exibidas quando novos alertas forem gerados</p>
            <p>• Configure orçamentos nas configurações de cada campanha</p>
          </CardContent>
        </Card>
      </div>
  );
}
