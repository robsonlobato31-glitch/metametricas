import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, RefreshCw, ChevronDown, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCampaignAlerts, GroupedCampaignAlert } from '@/hooks/useCampaignAlerts';
import { useRealtimeAlertsContext } from '@/contexts/RealtimeAlertsContext';
import { BudgetMonitorButton } from '@/components/BudgetMonitorButton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateAlertForm } from '@/components/alerts/CreateAlertForm';
import { AlertsList } from '@/components/alerts/AlertsList';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AlertaGasto() {
  const { alerts, isLoading, refetch } = useCampaignAlerts();
  const { clearNewAlertsCount } = useRealtimeAlertsContext();
  const [isSyncingMeta, setIsSyncingMeta] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'green' | 'yellow' | 'orange' | 'red'>('all');

  // Clear new alerts count when component mounts
  useEffect(() => {
    clearNewAlertsCount();
  }, [clearNewAlertsCount]);

  const handleSyncMeta = async () => {
    setIsSyncingMeta(true);
    try {
      const { data: campaignsData, error: campaignsError } = await supabase.functions.invoke('sync-meta-campaigns');
      if (campaignsError) throw campaignsError;
      
      if (campaignsData?.error === 'no_integration') {
        toast.error('Nenhuma integração Meta Ads encontrada', {
          description: 'Conecte sua conta Meta Ads primeiro nas configurações.',
        });
        return;
      }

      const { data: metricsData, error: metricsError } = await supabase.functions.invoke('sync-meta-metrics');
      if (metricsError) throw metricsError;
      
      if (metricsData?.error === 'no_integration') {
        toast.error('Nenhuma integração Meta Ads encontrada', {
          description: 'Conecte sua conta Meta Ads primeiro nas configurações.',
        });
        return;
      }

      toast.success('Meta Ads sincronizado com sucesso!');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar Meta Ads');
    } finally {
      setIsSyncingMeta(false);
    }
  };

  const handleSyncGoogle = async () => {
    setIsSyncingGoogle(true);
    try {
      const { error: dataError } = await supabase.functions.invoke('sync-google-ads-data');
      if (dataError) throw dataError;

      const { error: metricsError } = await supabase.functions.invoke('sync-google-ads-metrics');
      if (metricsError) throw metricsError;

      toast.success('Google Ads sincronizado com sucesso!');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar Google Ads');
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  const handleMonitorBudgets = async () => {
    setIsMonitoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('monitor-campaign-budgets');
      if (error) throw error;

      toast.success('Alertas Atualizados', {
        description: `${data.campaigns_checked} campanhas verificadas. ${data.alerts_updated || 0} alertas atualizados.`,
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao verificar orçamentos');
    } finally {
      setIsMonitoring(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusCategory = (percentage: number): 'green' | 'yellow' | 'orange' | 'red' => {
    if (percentage >= 100) return 'red';
    if (percentage >= 90) return 'orange';
    if (percentage >= 80) return 'yellow';
    return 'green';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (statusFilter === 'all') return true;
    return getStatusCategory(alert.percentage) === statusFilter;
  });

  const isSyncing = isSyncingMeta || isSyncingGoogle || isMonitoring;

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isLoading || isSyncing}>
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                )}
                Atualizar
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Atualizar Dados</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar do banco
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMonitorBudgets} disabled={isMonitoring}>
                {isMonitoring ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Atualizar Alertas Ativos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sincronizar Plataformas</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleSyncMeta} disabled={isSyncingMeta}>
                {isSyncingMeta ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.92 3.77-3.92 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/>
                  </svg>
                )}
                Meta Ads
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSyncGoogle} disabled={isSyncingGoogle}>
                {isSyncingGoogle ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Google Ads
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              `${alerts.length} Campanha(s) com Alerta`
            )}
          </CardTitle>
          <CardDescription>
            Campanhas que requerem atenção imediata
          </CardDescription>
          {/* Filtros de status */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('green')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'green' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              &lt; 80%
            </button>
            <button
              onClick={() => setStatusFilter('yellow')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'yellow' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              80% - 89%
            </button>
            <button
              onClick={() => setStatusFilter('orange')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'orange' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              90% - 99%
            </button>
            <button
              onClick={() => setStatusFilter('red')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                statusFilter === 'red' 
                  ? 'bg-destructive text-destructive-foreground' 
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-destructive" />
              ≥ 100%
            </button>
          </div>
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
          ) : filteredAlerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredAlerts.map((alert) => {
                const dailyBudget = alert.campaigns?.daily_budget || 0;
                const monthlyBudget = dailyBudget * 30;
                const accountName = alert.campaigns?.ad_accounts?.account_name || 'Conta não identificada';
                const percentage = alert.percentage ?? 0;
                
                return (
                  <div
                    key={alert.campaign_id}
                    className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors"
                  >
                    {/* Header with account name and badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground truncate flex-1" title={accountName}>
                        {accountName}
                      </p>
                      <Badge 
                        variant={percentage >= 100 ? "destructive" : "secondary"}
                        className="text-[10px] px-1.5 py-0 whitespace-nowrap"
                      >
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>

                    {/* Campaign name */}
                    <h3 className="text-sm font-medium truncate" title={alert.campaigns?.name || 'Campanha'}>
                      {alert.campaigns?.name || 'Campanha sem nome'}
                    </h3>

                    {/* Budget info */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Orçamento Diário:</span>
                        <span className="font-medium">{formatCurrency(dailyBudget)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Orçamento 30 dias:</span>
                        <span className="font-medium">{formatCurrency(monthlyBudget)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gasto Atual:</span>
                        <span className={`font-medium ${percentage >= 100 ? 'text-destructive' : percentage >= 80 ? 'text-yellow-500' : ''}`}>
                          {formatCurrency(alert.current_amount || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getProgressBarColor(percentage)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>

                    {/* Threshold Indicators */}
                    <div className="flex flex-wrap gap-3 pt-1">
                      {/* 80% indicator */}
                      <div className={`flex items-center gap-1 text-xs ${
                        percentage >= 80 ? 'text-yellow-600 dark:text-yellow-500' : 'text-muted-foreground'
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                          percentage >= 80 
                            ? 'bg-yellow-500 border-yellow-500' 
                            : 'bg-transparent border-muted-foreground/50'
                        }`} />
                        <span>80%</span>
                      </div>
                      
                      {/* 90% indicator */}
                      <div className={`flex items-center gap-1 text-xs ${
                        percentage >= 90 ? 'text-orange-600 dark:text-orange-500' : 'text-muted-foreground'
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                          percentage >= 90 
                            ? 'bg-orange-500 border-orange-500' 
                            : 'bg-transparent border-muted-foreground/50'
                        }`} />
                        <span>90%</span>
                      </div>
                      
                      {/* 100% indicator */}
                      <div className={`flex items-center gap-1 text-xs ${
                        percentage >= 100 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                          percentage >= 100 
                            ? 'bg-destructive border-destructive' 
                            : 'bg-transparent border-muted-foreground/50'
                        }`} />
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Status message */}
                    {percentage >= 100 ? (
                      <div className="flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Excedido: {formatCurrency((alert.current_amount || 0) - monthlyBudget)}</span>
                      </div>
                    ) : percentage >= 90 ? (
                      <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-500">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Atenção: 90% do orçamento atingido</span>
                      </div>
                    ) : percentage >= 80 && (
                      <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Alerta: 80% do orçamento atingido</span>
                      </div>
                    )}

                    {/* Updated date */}
                    <p className="text-[10px] text-muted-foreground">
                      Atualizado:{' '}
                      {format(new Date(alert.updated_at), "dd/MM/yyyy 'às' HH:mm", {
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
          <p>• Cada card representa uma campanha única com 3 indicadores de alerta (80%, 90%, 100%)</p>
          <p>• Os indicadores são ativados automaticamente conforme o gasto atinge cada threshold</p>
          <p>• Notificações em tempo real serão exibidas quando novos alertas forem gerados</p>
          <p>• Configure orçamentos nas configurações de cada campanha</p>
        </CardContent>
      </Card>
    </div>
  );
}