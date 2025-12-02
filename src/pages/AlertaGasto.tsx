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
import { CreateAlertForm } from '@/components/alerts/CreateAlertForm';
import { AlertsList } from '@/components/alerts/AlertsList';

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

        {/* Custom Alerts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AlertsList />
          <CreateAlertForm />
        </div>

        {/* Triggered Alerts Section */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : alerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {alerts.map((alert) => {
                  const dailyBudget = alert.campaigns.daily_budget || alert.threshold_amount;
                  const monthlyBudget = dailyBudget * 30;
                  const accountName = alert.campaigns.ad_accounts?.account_name || 'Conta não identificada';
                  
                  return (
                    <div
                      key={alert.id}
                      className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors"
                    >
                      {/* Header with account name and badge */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground truncate flex-1" title={accountName}>
                          {accountName}
                        </p>
                        <Badge 
                          variant="destructive" 
                          className="text-[10px] px-1.5 py-0 whitespace-nowrap"
                        >
                          {alert.percentage.toFixed(1)}%
                        </Badge>
                      </div>

                      {/* Campaign name */}
                      <h3 className="text-sm font-medium truncate" title={alert.campaigns.name}>
                        {alert.campaigns.name}
                      </h3>

                      {/* Budget info */}
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Orçamento:</span>
                          <span className="font-medium">{formatCurrency(dailyBudget)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Orçamento 30 dias:</span>
                          <span className="font-medium">{formatCurrency(monthlyBudget)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gasto Atual:</span>
                          <span className={`font-medium ${getStatusColor(alert.percentage)}`}>
                            {formatCurrency(alert.current_amount)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
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

                      {/* Status message */}
                      {alert.percentage >= 100 && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Orçamento excedido!</span>
                        </div>
                      )}

                      {/* Triggered date */}
                      <p className="text-[10px] text-muted-foreground">
                        Disparado em:{' '}
                        {format(new Date(alert.triggered_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  );
                })}
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
