import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle } from 'lucide-react';

export default function AlertaGasto() {
  // Mock data - will be replaced with useCampaignAlerts hook
  const alerts = [
    {
      id: '1',
      campaign: 'Campanha Black Friday',
      threshold: 500,
      current: 487.50,
      percentage: 97.5,
      status: 'critical',
    },
    {
      id: '2',
      campaign: 'Lançamento Produto X',
      threshold: 1000,
      current: 820.30,
      percentage: 82.0,
      status: 'warning',
    },
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'critical') {
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
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas de Gasto</h1>
          <p className="text-muted-foreground mt-1">
            Monitore campanhas que estão próximas ou ultrapassaram o orçamento
          </p>
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
            <CardTitle>{alerts.length} Alerta(s) Ativo(s)</CardTitle>
            <CardDescription>
              Campanhas que requerem atenção imediata
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{alert.campaign}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Orçamento: {formatCurrency(alert.threshold)}
                        </p>
                      </div>
                      {getStatusBadge(alert.status)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Gasto Atual</span>
                        <span className={`font-medium ${getStatusColor(alert.percentage)}`}>
                          {formatCurrency(alert.current)} ({alert.percentage.toFixed(1)}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            alert.percentage >= 95
                              ? 'bg-destructive'
                              : alert.percentage >= 80
                              ? 'bg-yellow-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                        />
                      </div>

                      {alert.percentage >= 95 && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Orçamento quase esgotado!</span>
                        </div>
                      )}
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
    </DashboardLayout>
  );
}
