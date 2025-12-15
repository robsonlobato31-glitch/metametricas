import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export const useSyncMetrics = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFullSyncLoading, setIsFullSyncLoading] = useState(false);

  const syncMetaMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-meta-metrics', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['topCreatives'] });
      
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

  const syncMetaCampaignsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-meta-campaigns', {
        method: 'POST',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['adAccounts'] });
    },
    onError: (error: any) => {
      throw error;
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

  const fullMetaSync = async () => {
    setIsFullSyncLoading(true);
    try {
      toast({
        title: 'Sincronização Completa Iniciada',
        description: 'Sincronizando campanhas e ads...',
      });

      // Step 1: Sync campaigns, ad sets, and ads
      await syncMetaCampaignsMutation.mutateAsync();
      
      toast({
        title: 'Campanhas Sincronizadas!',
        description: 'Agora sincronizando métricas...',
      });

      // Step 2: Sync metrics (now with ad_ids available)
      await syncMetaMutation.mutateAsync();

      toast({
        title: 'Sincronização Completa!',
        description: 'Campanhas, ads e métricas foram sincronizados com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro na Sincronização',
        description: error.message || 'Ocorreu um erro durante a sincronização.',
        variant: 'destructive',
      });
    } finally {
      setIsFullSyncLoading(false);
    }
  };

  return {
    syncMeta: syncMetaMutation.mutate,
    syncGoogle: syncGoogleMutation.mutate,
    fullMetaSync,
    isLoading: syncMetaMutation.isPending || syncGoogleMutation.isPending,
    isFullSyncLoading,
  };
};
