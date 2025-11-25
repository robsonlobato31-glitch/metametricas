import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface ReportTemplate {
  id: string;
  user_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  header_text: string;
  footer_text: string | null;
  created_at: string;
  updated_at: string;
}

export const useReportTemplate = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ['report-template', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No template found, return default
          return null;
        }
        throw error;
      }

      return data as ReportTemplate;
    },
    enabled: !!user?.id,
  });

  const updateTemplate = useMutation({
    mutationFn: async (updates: Partial<ReportTemplate>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('report_templates')
        .upsert({
          user_id: user.id,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-template', user?.id] });
      toast({
        title: 'Template atualizado',
        description: 'As configurações do relatório foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('report-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('report-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    },
    onSuccess: (logoUrl) => {
      updateTemplate.mutate({ logo_url: logoUrl });
    },
    onError: (error) => {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível fazer upload do logo. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    template,
    isLoading,
    updateTemplate: updateTemplate.mutate,
    uploadLogo: uploadLogo.mutate,
    isUpdating: updateTemplate.isPending || uploadLogo.isPending,
  };
};
