import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSpendingAlerts, SpendingAlert } from '@/hooks/useSpendingAlerts';
import { Trash2, Bell, Mail, Globe } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const METRIC_LABELS: Record<string, string> = {
  daily_spend: 'Gasto Diário',
  monthly_spend: 'Gasto Mensal',
  cpc: 'CPC',
  ctr: 'CTR',
  cpm: 'CPM',
};

const getProviderLabel = (provider: string | null) => {
  if (!provider) return 'Todas';
  return provider === 'meta' ? 'Meta Ads' : 'Google Ads';
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface AlertItemProps {
  alert: SpendingAlert;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const AlertItem = ({ alert, onToggle, onDelete, isDeleting }: AlertItemProps) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium truncate">{alert.name}</span>
          {alert.send_email && (
            <Mail className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {METRIC_LABELS[alert.metric_type] || alert.metric_type}
          </Badge>
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {getProviderLabel(alert.provider)}
          </span>
          <span>•</span>
          <span>{formatCurrency(alert.threshold_amount)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <Switch
          checked={alert.is_active}
          onCheckedChange={(checked) => onToggle(alert.id, checked)}
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Alerta</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este alerta? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(alert.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export const AlertsList = () => {
  const { alerts, isLoading, toggleAlert, deleteAlert } = useSpendingAlerts();

  const handleToggle = (id: string, isActive: boolean) => {
    toggleAlert.mutate({ id, is_active: isActive });
  };

  const handleDelete = (id: string) => {
    deleteAlert.mutate(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alertas Configurados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Alertas Configurados ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum alerta configurado ainda. Crie seu primeiro alerta!
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onToggle={handleToggle}
                onDelete={handleDelete}
                isDeleting={deleteAlert.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
