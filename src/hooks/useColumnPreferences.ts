import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type PageName = 'campaigns' | 'budget_dashboard' | 'metrics' | 'dashboard';

export interface ColumnPreference {
  id: string;
  user_id: string;
  page_name: PageName;
  visible_columns: string[];
  column_order: string[];
}

export const useColumnPreferences = (pageName: PageName) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['column-preferences', user?.id, pageName],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_column_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('page_name', pageName)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as ColumnPreference | null;
    },
    enabled: !!user?.id,
  });

  const savePreferences = useMutation({
    mutationFn: async ({
      visibleColumns,
      columnOrder,
    }: {
      visibleColumns: string[];
      columnOrder?: string[];
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_column_preferences')
        .upsert({
          user_id: user.id,
          page_name: pageName,
          visible_columns: visibleColumns,
          column_order: columnOrder || visibleColumns,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column-preferences', user?.id, pageName] });
      toast.success('Preferências de colunas salvas');
    },
    onError: (error) => {
      console.error('Error saving column preferences:', error);
      toast.error('Erro ao salvar preferências');
    },
  });

  return {
    preferences,
    isLoading,
    savePreferences: savePreferences.mutate,
    isSaving: savePreferences.isPending,
  };
};
