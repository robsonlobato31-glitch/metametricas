import { Button } from '@/components/ui/button';
import { RefreshCw, RefreshCcw } from 'lucide-react';
import { useSyncMetrics } from '@/hooks/useSyncMetrics';
import { useIntegrations } from '@/hooks/useIntegrations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncMetricsButtonProps {
  provider?: 'meta' | 'google' | 'all';
  fullSync?: boolean;
}

export const SyncMetricsButton = ({ provider = 'all', fullSync = false }: SyncMetricsButtonProps) => {
  const { syncMeta, syncGoogle, fullMetaSync, isLoading, isFullSyncLoading } = useSyncMetrics();
  const { data: integrations } = useIntegrations();

  const hasMeta = integrations?.some(i => i.provider === 'meta' && i.status === 'active');
  const hasGoogle = integrations?.some(i => i.provider === 'google' && i.status === 'active');

  const handleSync = async () => {
    if (fullSync && hasMeta) {
      fullMetaSync();
      return;
    }
    
    if ((provider === 'all' || provider === 'meta') && hasMeta) {
      syncMeta();
    }
    if ((provider === 'all' || provider === 'google') && hasGoogle) {
      syncGoogle();
    }
  };

  if (!hasMeta && !hasGoogle) {
    return null;
  }

  const loading = isLoading || isFullSyncLoading;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={loading}
          >
            {fullSync ? (
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            ) : (
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            )}
            {fullSync ? 'Sincronização Completa' : 'Sincronizar Métricas'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {fullSync 
              ? 'Sincroniza campanhas, ads e métricas em sequência (recomendado)'
              : 'Sincroniza as métricas das suas campanhas dos últimos 30 dias'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
