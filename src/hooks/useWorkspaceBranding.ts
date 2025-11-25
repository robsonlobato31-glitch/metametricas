import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandingData {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  company_name?: string;
  custom_domain?: string;
}

export const useWorkspaceBranding = (workspaceId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: branding, isLoading } = useQuery({
    queryKey: ['workspace-branding', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from('workspace_branding')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const updateBranding = useMutation({
    mutationFn: async (brandingData: BrandingData) => {
      if (!workspaceId) throw new Error('Workspace não definido');

      const { data, error } = await supabase
        .from('workspace_branding')
        .upsert({
          workspace_id: workspaceId,
          ...brandingData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-branding', workspaceId] });
      toast.success('Marca atualizada!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar marca');
    },
  });

  return {
    branding,
    isLoading,
    updateBranding: updateBranding.mutate,
  };
};
