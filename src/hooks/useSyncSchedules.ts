import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface SyncSchedule {
  id: string;
  user_id: string;
  provider: 'meta' | 'google';
  sync_type: 'campaigns' | 'metrics' | 'full';
  is_active: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  last_sync_at: string | null;
  next_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useSyncSchedules = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['sync-schedules', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('sync_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SyncSchedule[];
    },
    enabled: !!user?.id,
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: Omit<SyncSchedule, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_sync_at' | 'next_sync_at'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('sync_schedules')
        .insert({
          user_id: user.id,
          ...schedule,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-schedules', user?.id] });
      toast({
        title: 'Sincronização agendada',
        description: 'A sincronização automática foi configurada com sucesso.',
      });
    },
    onError: (error: any) => {
      console.error('Error creating schedule:', error);
      toast({
        title: 'Erro ao agendar',
        description: error.message || 'Não foi possível criar o agendamento.',
        variant: 'destructive',
      });
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SyncSchedule> }) => {
      const { data, error } = await supabase
        .from('sync_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-schedules', user?.id] });
      toast({
        title: 'Agendamento atualizado',
        description: 'As configurações foram salvas com sucesso.',
      });
    },
    onError: (error: any) => {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar o agendamento.',
        variant: 'destructive',
      });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sync_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-schedules', user?.id] });
      toast({
        title: 'Agendamento removido',
        description: 'A sincronização automática foi cancelada.',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Erro ao remover',
        description: error.message || 'Não foi possível remover o agendamento.',
        variant: 'destructive',
      });
    },
  });

  return {
    schedules,
    isLoading,
    createSchedule: createSchedule.mutate,
    updateSchedule: updateSchedule.mutate,
    deleteSchedule: deleteSchedule.mutate,
    isCreating: createSchedule.isPending,
    isUpdating: updateSchedule.isPending,
    isDeleting: deleteSchedule.isPending,
  };
};
