import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SpendingAlert {
  id: string;
  user_id: string;
  name: string;
  metric_type: 'daily_spend' | 'monthly_spend' | 'cpc' | 'ctr' | 'cpm';
  condition: 'greater_than' | 'less_than';
  threshold_amount: number;
  provider: 'meta' | 'google' | null;
  ad_account_id: string | null;
  campaign_id: string | null;
  send_email: boolean;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSpendingAlertInput {
  name: string;
  metric_type: SpendingAlert['metric_type'];
  condition: SpendingAlert['condition'];
  threshold_amount: number;
  provider?: 'meta' | 'google' | null;
  ad_account_id?: string | null;
  campaign_id?: string | null;
  send_email?: boolean;
}

export const useSpendingAlerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['spending-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('spending_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SpendingAlert[];
    },
    enabled: !!user?.id,
  });

  const createAlert = useMutation({
    mutationFn: async (input: CreateSpendingAlertInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('spending_alerts')
        .insert({
          user_id: user.id,
          name: input.name,
          metric_type: input.metric_type,
          condition: input.condition,
          threshold_amount: input.threshold_amount,
          provider: input.provider || null,
          ad_account_id: input.ad_account_id || null,
          campaign_id: input.campaign_id || null,
          send_email: input.send_email || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spending-alerts'] });
      toast.success('Alerta criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar alerta', { description: error.message });
    },
  });

  const updateAlert = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SpendingAlert> & { id: string }) => {
      const { data, error } = await supabase
        .from('spending_alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spending-alerts'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar alerta', { description: error.message });
    },
  });

  const toggleAlert = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('spending_alerts')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spending-alerts'] });
      toast.success(variables.is_active ? 'Alerta ativado' : 'Alerta desativado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar alerta', { description: error.message });
    },
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('spending_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spending-alerts'] });
      toast.success('Alerta excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir alerta', { description: error.message });
    },
  });

  return {
    alerts,
    isLoading,
    refetch,
    createAlert,
    updateAlert,
    toggleAlert,
    deleteAlert,
  };
};
