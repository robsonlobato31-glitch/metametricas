import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PageName } from './useColumnPreferences';

export interface ColumnPreset {
  id: string;
  user_id: string;
  page_name: string;
  preset_name: string;
  visible_columns: string[];
  column_order: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useColumnPresets = (pageName: PageName) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: presets, isLoading } = useQuery({
    queryKey: ['column-presets', user?.id, pageName],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_column_presets')
        .select('*')
        .eq('user_id', user.id)
        .eq('page_name', pageName)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ColumnPreset[];
    },
    enabled: !!user?.id,
  });

  const createPreset = useMutation({
    mutationFn: async ({
      presetName,
      visibleColumns,
      columnOrder,
      isDefault = false,
    }: {
      presetName: string;
      visibleColumns: string[];
      columnOrder?: string[];
      isDefault?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase
          .from('user_column_presets')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('page_name', pageName);
      }

      const { data, error } = await supabase
        .from('user_column_presets')
        .insert({
          user_id: user.id,
          page_name: pageName,
          preset_name: presetName,
          visible_columns: visibleColumns,
          column_order: columnOrder || visibleColumns,
          is_default: isDefault,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column-presets', user?.id, pageName] });
      toast.success('Preset salvo com sucesso');
    },
    onError: (error: any) => {
      console.error('Error creating preset:', error);
      if (error.code === '23505') {
        toast.error('Já existe um preset com esse nome');
      } else {
        toast.error('Erro ao salvar preset');
      }
    },
  });

  const updatePreset = useMutation({
    mutationFn: async ({
      id,
      presetName,
      visibleColumns,
      columnOrder,
      isDefault,
    }: {
      id: string;
      presetName?: string;
      visibleColumns?: string[];
      columnOrder?: string[];
      isDefault?: boolean;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // If setting as default, unset other defaults first
      if (isDefault) {
        await supabase
          .from('user_column_presets')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('page_name', pageName);
      }

      const updateData: Partial<ColumnPreset> = {};
      if (presetName !== undefined) updateData.preset_name = presetName;
      if (visibleColumns !== undefined) updateData.visible_columns = visibleColumns;
      if (columnOrder !== undefined) updateData.column_order = columnOrder;
      if (isDefault !== undefined) updateData.is_default = isDefault;

      const { data, error } = await supabase
        .from('user_column_presets')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column-presets', user?.id, pageName] });
      toast.success('Preset atualizado');
    },
    onError: (error) => {
      console.error('Error updating preset:', error);
      toast.error('Erro ao atualizar preset');
    },
  });

  const deletePreset = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_column_presets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['column-presets', user?.id, pageName] });
      toast.success('Preset excluído');
    },
    onError: (error) => {
      console.error('Error deleting preset:', error);
      toast.error('Erro ao excluir preset');
    },
  });

  const defaultPreset = presets?.find((p) => p.is_default);

  return {
    presets: presets || [],
    defaultPreset,
    isLoading,
    createPreset: createPreset.mutate,
    updatePreset: updatePreset.mutate,
    deletePreset: deletePreset.mutate,
    isCreating: createPreset.isPending,
    isUpdating: updatePreset.isPending,
    isDeleting: deletePreset.isPending,
  };
};
