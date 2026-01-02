import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Query keys que devem ser invalidadas após sincronização de conta Meta
const ACCOUNT_QUERY_KEYS = [
  'metrics',
  'campaigns',
  'ad-accounts',
  'demographics',
  'region-breakdown',
  'top-creatives',
  'funnel-metrics',
  'timeline-metrics',
  'daily-metrics',
  'chart-data',
  'platform-breakdown',
  'last-sync',
];

export const useSyncAccountMetrics = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidateAllQueries = () => {
    ACCOUNT_QUERY_KEYS.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  const syncAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke('sync-meta-account-metrics', {
        method: 'POST',
        body: { account_id: accountId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidar todas as queries relevantes
      invalidateAllQueries();
      
      toast({
        title: 'Conta Sincronizada!',
        description: `${data?.account_name}: ${data?.metricsSynced || 0} métricas e ${data?.breakdownsSynced || 0} breakdowns sincronizados.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao Sincronizar Conta',
        description: error.message || 'Ocorreu um erro ao sincronizar a conta.',
        variant: 'destructive',
      });
    },
  });

  return {
    syncAccount: syncAccountMutation.mutate,
    syncAccountAsync: syncAccountMutation.mutateAsync,
    isLoading: syncAccountMutation.isPending,
  };
};
