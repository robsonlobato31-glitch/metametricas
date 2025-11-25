import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSyncMetrics = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncMetaMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-meta-metrics', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalida queries de métricas para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      
      toast({
        title: 'Métricas Sincronizadas!',
        description: `${data?.metricsSynced || 0} métricas foram sincronizadas com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao Sincronizar Métricas',
        description: error.message || 'Ocorreu um erro ao sincronizar as métricas.',
        variant: 'destructive',
      });
    },
  });

  const syncGoogleMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-google-ads-metrics', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalida queries de métricas para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      
      toast({
        title: 'Métricas Google Ads Sincronizadas!',
        description: `Métricas sincronizadas com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao Sincronizar Métricas Google',
        description: error.message || 'Ocorreu um erro ao sincronizar as métricas do Google Ads.',
        variant: 'destructive',
      });
    },
  });

  return {
    syncMeta: syncMetaMutation.mutate,
    syncGoogle: syncGoogleMutation.mutate,
    isLoading: syncMetaMutation.isPending || syncGoogleMutation.isPending,
  };
};
