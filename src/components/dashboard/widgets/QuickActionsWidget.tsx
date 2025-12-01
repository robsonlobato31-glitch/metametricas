import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, Settings, Bell, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMetrics } from '@/hooks/useMetrics';
import { useSyncMetrics } from '@/hooks/useSyncMetrics';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useToast } from '@/hooks/use-toast';

export const QuickActionsWidget = () => {
  const navigate = useNavigate();
  const { refetch, isLoading: metricsLoading } = useMetrics();
  const { syncMeta, syncGoogle, isLoading: syncLoading } = useSyncMetrics();
  const { data: integrations } = useIntegrations();
  const { toast } = useToast();

  const hasMeta = integrations?.some(i => i.provider === 'meta' && i.status === 'active');
  const hasGoogle = integrations?.some(i => i.provider === 'google' && i.status === 'active');

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: 'Dados Atualizados',
      description: 'As métricas foram recarregadas com sucesso.',
    });
  };

  const handleSyncMetrics = () => {
    if (hasMeta) {
      syncMeta();
    }
    if (hasGoogle) {
      syncGoogle();
    }
  };

  const actions = [
    {
      label: 'Sincronizar Métricas',
      icon: Database,
      onClick: handleSyncMetrics,
      loading: syncLoading,
      variant: 'default' as const,
    },
    {
      label: 'Atualizar Dados',
      icon: RefreshCw,
      onClick: handleRefresh,
      loading: metricsLoading,
      variant: 'outline' as const,
    },
    {
      label: 'Gerar Relatório',
      icon: FileText,
      onClick: () => navigate('/metricas'),
      variant: 'outline' as const,
    },
    {
      label: 'Configurar Alertas',
      icon: Bell,
      onClick: () => navigate('/alerta-gasto'),
      variant: 'outline' as const,
    },
    {
      label: 'Configurações',
      icon: Settings,
      onClick: () => navigate('/settings'),
      variant: 'outline' as const,
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => (
            <Button
              key={action.label}
              variant={action.variant}
              onClick={action.onClick}
              disabled={action.loading}
              className={`h-auto flex-col gap-2 py-3 ${index === actions.length - 1 ? 'col-span-2' : ''}`}
            >
              <action.icon className={`h-4 w-4 ${action.loading ? 'animate-spin' : ''}`} />
              <span className="text-xs text-center leading-tight">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
