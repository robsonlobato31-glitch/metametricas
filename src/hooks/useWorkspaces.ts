import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useWorkspaces = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          workspace_members!inner(role),
          workspace_branding(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createWorkspace = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('workspaces')
        .insert({ name, slug, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Adicionar usuário como owner
      await supabase
        .from('workspace_members')
        .insert({ workspace_id: data.id, user_id: user.id, role: 'owner' });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar workspace');
    },
  });

  const updateWorkspace = useMutation({
    mutationFn: async ({ id, name, slug }: { id: string; name: string; slug: string }) => {
      const { data, error } = await supabase
        .from('workspaces')
        .update({ name, slug })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar workspace');
    },
  });

  const deleteWorkspace = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir workspace');
    },
  });

  return {
    workspaces: workspaces || [],
    isLoading,
    createWorkspace: createWorkspace.mutate,
    updateWorkspace: updateWorkspace.mutate,
    deleteWorkspace: deleteWorkspace.mutate,
  };
};
