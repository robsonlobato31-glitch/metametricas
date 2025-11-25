import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useOnboarding = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: onboarding, isLoading } = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const startTourMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          tour_completed: false,
          current_step: 0,
          started_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', user?.id] });
    },
  });

  const completeStepMutation = useMutation({
    mutationFn: async (step: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const currentSteps = onboarding?.completed_steps || [];
      const updatedSteps = [...currentSteps, step].filter((v, i, a) => a.indexOf(v) === i);

      const { data, error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          completed_steps: updatedSteps,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', user?.id] });
    },
  });

  const completeTourMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          tour_completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', user?.id] });
      toast({
        title: 'Tour Concluído! 🎉',
        description: 'Você está pronto para começar a usar a plataforma.',
      });
    },
  });

  const skipOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          tour_completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', user?.id] });
    },
  });

  return {
    onboarding,
    isLoading,
    startTour: startTourMutation.mutate,
    completeStep: completeStepMutation.mutate,
    completeTour: completeTourMutation.mutate,
    skipOnboarding: skipOnboardingMutation.mutate,
    isTourCompleted: onboarding?.tour_completed || false,
    completedSteps: onboarding?.completed_steps || [],
  };
};
