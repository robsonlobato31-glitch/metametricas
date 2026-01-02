import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Query keys que devem ser invalidadas após sincronização
const META_QUERY_KEYS = [
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

const GOOGLE_QUERY_KEYS = [
  'metrics',
  'campaigns',
  'ad-accounts',
  'google-ads-campaigns',
  'funnel-metrics',
  'timeline-metrics',
  'daily-metrics',
  'chart-data',
  'platform-breakdown',
  'last-sync',
];

export const useSyncMetrics = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidateMetaQueries = () => {
    META_QUERY_KEYS.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  const invalidateGoogleQueries = () => {
    GOOGLE_QUERY_KEYS.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  const syncMetaMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-meta-metrics', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalida TODAS as queries relacionadas ao Meta
      invalidateMetaQueries();
      
      toast({
        title: 'Métricas Meta Sincronizadas!',
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
      // Invalida TODAS as queries relacionadas ao Google
      invalidateGoogleQueries();
      
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
    syncMetaAsync: syncMetaMutation.mutateAsync,
    syncGoogleAsync: syncGoogleMutation.mutateAsync,
    isLoadingMeta: syncMetaMutation.isPending,
    isLoadingGoogle: syncGoogleMutation.isPending,
    isLoading: syncMetaMutation.isPending || syncGoogleMutation.isPending,
  };
};
