import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useWorkspaceMembers = (workspaceId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('workspace_members')
        .select('*, workspaces(name)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'owner' | 'admin' | 'editor' | 'viewer' }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast.success('Permissão atualizada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar permissão');
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast.success('Membro removido!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover membro');
    },
  });

  return {
    members: members || [],
    isLoading,
    updateMemberRole: updateMemberRole.mutate,
    removeMember: removeMember.mutate,
  };
};
