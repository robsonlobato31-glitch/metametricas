import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
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
}

export const SyncMetricsButton = ({ provider = 'all' }: SyncMetricsButtonProps) => {
  const { syncMeta, syncGoogle, isLoading } = useSyncMetrics();
  const { data: integrations } = useIntegrations();

  const hasMeta = integrations?.some(i => i.provider === 'meta' && i.status === 'active');
  const hasGoogle = integrations?.some(i => i.provider === 'google' && i.status === 'active');

  const handleSync = async () => {
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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar Métricas
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sincroniza as métricas das suas campanhas dos últimos 30 dias</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
