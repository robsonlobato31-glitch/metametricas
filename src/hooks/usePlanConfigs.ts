import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PlanConfig = {
  id: string;
  plan_type: 'survival' | 'professional' | 'agency' | 'enterprise';
  name: string;
  price_display: string;
  price_amount: number;
  description: string | null;
  features: string[];
  is_highlighted: boolean;
  is_active: boolean;
  hotmart_url: string | null;
  display_order: number;
};

export const usePlanConfigs = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: planConfigs, isLoading } = useQuery({
    queryKey: ['plan-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_configurations')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as PlanConfig[];
    },
  });

  const updatePlanConfig = useMutation({
    mutationFn: async (config: Partial<PlanConfig> & { id: string }) => {
      const { error } = await supabase
        .from('plan_configurations')
        .update(config)
        .eq('id', config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-configs'] });
      toast({
        title: 'Plano atualizado',
        description: 'As configurações do plano foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    planConfigs,
    isLoading,
    updatePlanConfig: updatePlanConfig.mutate,
  };
};
