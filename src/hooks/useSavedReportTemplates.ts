import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { ExportConfig } from '@/components/reports/ExportReportDialog';
import type { Json } from '@/integrations/supabase/types';

export interface SavedReportTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  config: ExportConfig;
  created_at: string;
  updated_at: string;
}

export const useSavedReportTemplates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['saved-report-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('saved_report_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((item) => ({
        ...item,
        config: item.config as unknown as ExportConfig,
      })) as SavedReportTemplate[];
    },
    enabled: !!user?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async ({
      name,
      description,
      config,
    }: {
      name: string;
      description?: string;
      config: ExportConfig;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('saved_report_templates')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          config: config as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-report-templates'] });
      toast({
        title: 'Template salvo',
        description: 'O template foi criado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o template.',
        variant: 'destructive',
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      config,
    }: {
      id: string;
      name: string;
      description?: string;
      config: ExportConfig;
    }) => {
      const { data, error } = await supabase
        .from('saved_report_templates')
        .update({
          name,
          description: description || null,
          config: config as unknown as Json,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-report-templates'] });
      toast({
        title: 'Template atualizado',
        description: 'O template foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o template.',
        variant: 'destructive',
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_report_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-report-templates'] });
      toast({
        title: 'Template excluído',
        description: 'O template foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o template.',
        variant: 'destructive',
      });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
