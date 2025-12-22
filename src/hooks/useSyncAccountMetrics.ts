import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSyncAccountMetrics = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['demographics'] });
      queryClient.invalidateQueries({ queryKey: ['region-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['top-creatives'] });
      
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
