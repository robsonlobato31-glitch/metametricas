import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useSyncSchedules } from '@/hooks/useSyncSchedules';
import { useIntegrations } from '@/hooks/useIntegrations';

export const SyncScheduleSettings = () => {
  const { schedules, isLoading, createSchedule, updateSchedule, deleteSchedule, isCreating } =
    useSyncSchedules();
  const { data: integrations } = useIntegrations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    provider: 'meta' as 'meta' | 'google',
    sync_type: 'full' as 'campaigns' | 'metrics' | 'full',
    frequency: 'daily' as 'hourly' | 'daily' | 'weekly',
    is_active: true,
  });

  const handleCreate = () => {
    createSchedule(newSchedule);
    setDialogOpen(false);
    setNewSchedule({
      provider: 'meta',
      sync_type: 'full',
      frequency: 'daily',
      is_active: true,
    });
  };

  const getProviderName = (provider: string) => {
    return provider === 'meta' ? 'Meta Ads' : 'Google Ads';
  };

  const getSyncTypeName = (type: string) => {
    const types = {
      campaigns: 'Campanhas',
      metrics: 'Métricas',
      full: 'Completa',
    };
    return types[type as keyof typeof types] || type;
  };

  const getFrequencyName = (frequency: string) => {
    const frequencies = {
      hourly: 'A cada hora',
      daily: 'Diariamente',
      weekly: 'Semanalmente',
    };
    return frequencies[frequency as keyof typeof frequencies] || frequency;
  };

  const hasActiveIntegration = (provider: 'meta' | 'google') => {
    return integrations?.some(
      (int) => int.provider === provider && int.status === 'active'
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Sincronização Automática
            </CardTitle>
            <CardDescription>
              Configure a atualização automática das suas métricas e campanhas
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Sincronização Automática</DialogTitle>
                <DialogDescription>
                  Configure uma nova sincronização automática de dados
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select
                    value={newSchedule.provider}
                    onValueChange={(value: 'meta' | 'google') =>
                      setNewSchedule({ ...newSchedule, provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta" disabled={!hasActiveIntegration('meta')}>
                        Meta Ads {!hasActiveIntegration('meta') && '(Não conectado)'}
                      </SelectItem>
                      <SelectItem value="google" disabled={!hasActiveIntegration('google')}>
                        Google Ads {!hasActiveIntegration('google') && '(Não conectado)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Sincronização</Label>
                  <Select
                    value={newSchedule.sync_type}
                    onValueChange={(value: 'campaigns' | 'metrics' | 'full') =>
                      setNewSchedule({ ...newSchedule, sync_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Completa (Campanhas + Métricas)</SelectItem>
                      <SelectItem value="campaigns">Apenas Campanhas</SelectItem>
                      <SelectItem value="metrics">Apenas Métricas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={newSchedule.frequency}
                    onValueChange={(value: 'hourly' | 'daily' | 'weekly') =>
                      setNewSchedule({ ...newSchedule, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">A cada hora</SelectItem>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={isCreating} className="w-full">
                {isCreating ? 'Criando...' : 'Criar Agendamento'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!schedules || schedules.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhuma sincronização automática configurada.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie um agendamento para manter seus dados sempre atualizados.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{getProviderName(schedule.provider)}</span>
                    <Badge variant="outline">{getSyncTypeName(schedule.sync_type)}</Badge>
                    <Badge variant="secondary">{getFrequencyName(schedule.frequency)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {schedule.last_sync_at && (
                      <p>
                        Última sincronização:{' '}
                        {new Date(schedule.last_sync_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                    {schedule.next_sync_at && (
                      <p>
                        Próxima sincronização:{' '}
                        {new Date(schedule.next_sync_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={schedule.is_active}
                    onCheckedChange={(checked) =>
                      updateSchedule({
                        id: schedule.id,
                        updates: { is_active: checked },
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSchedule(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
