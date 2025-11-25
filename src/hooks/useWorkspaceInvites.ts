import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useWorkspaceInvites = (workspaceId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invites, isLoading } = useQuery({
    queryKey: ['workspace-invites', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const createInvite = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'owner' | 'admin' | 'editor' | 'viewer' }) => {
      if (!workspaceId || !user?.id) throw new Error('Workspace ou usuário não definido');

      const { data, error } = await supabase
        .from('workspace_invites')
        .insert([{
          workspace_id: workspaceId,
          email,
          role,
          invited_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] });
      toast.success('Convite enviado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar convite');
    },
  });

  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('workspace_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', workspaceId] });
      toast.success('Convite cancelado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cancelar convite');
    },
  });

  return {
    invites: invites || [],
    isLoading,
    createInvite: createInvite.mutate,
    cancelInvite: cancelInvite.mutate,
  };
};
