import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, Settings, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMetrics } from '@/hooks/useMetrics';
import { useToast } from '@/hooks/use-toast';

export const QuickActionsWidget = () => {
  const navigate = useNavigate();
  const { refetch, isLoading } = useMetrics();
  const { toast } = useToast();

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: 'Dados Atualizados',
      description: 'As métricas foram sincronizadas com sucesso.',
    });
  };

  const actions = [
    {
      label: 'Atualizar Dados',
      icon: RefreshCw,
      onClick: handleRefresh,
      loading: isLoading,
      variant: 'default' as const,
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
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              onClick={action.onClick}
              disabled={action.loading}
              className="h-auto flex-col gap-2 py-4"
            >
              <action.icon className={`h-5 w-5 ${action.loading ? 'animate-spin' : ''}`} />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
