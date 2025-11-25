import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout, DEFAULT_LAYOUT, DashboardWidget, LayoutItem } from '@/types/dashboard';
import { useCallback } from 'react';

export const useDashboardLayout = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedLayout, isLoading } = useQuery({
    queryKey: ['dashboard-layout', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return DEFAULT_LAYOUT;

      return {
        layouts: data.layout as unknown as { lg: LayoutItem[]; md: LayoutItem[]; sm: LayoutItem[] },
        widgets: data.widgets as unknown as DashboardWidget[],
      } as DashboardLayout;
    },
    enabled: !!user?.id,
  });

  const saveLayoutMutation = useMutation({
    mutationFn: async (layout: DashboardLayout) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('dashboard_layouts')
        .upsert([{
          user_id: user.id,
          layout: layout.layouts as any,
          widgets: layout.widgets as any,
        }], { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout', user?.id] });
    },
  });

  const resetLayoutMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('dashboard_layouts')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout', user?.id] });
      toast({
        title: 'Layout Resetado',
        description: 'O layout foi restaurado para o padrão.',
      });
    },
  });

  const saveLayout = useCallback((layout: DashboardLayout) => {
    saveLayoutMutation.mutate(layout);
  }, [saveLayoutMutation]);

  const resetLayout = useCallback(() => {
    resetLayoutMutation.mutate();
  }, [resetLayoutMutation]);

  const addWidget = useCallback((widget: DashboardWidget) => {
    if (!savedLayout) return;

    const newWidgets = [...savedLayout.widgets, widget];
    const newLayoutItem: LayoutItem = {
      i: widget.id,
      x: 0,
      y: Infinity, // Adiciona no final
      w: 6,
      h: 3,
      minW: 3,
      minH: 2,
    };

    const newLayout: DashboardLayout = {
      layouts: {
        lg: [...savedLayout.layouts.lg, newLayoutItem],
        md: [...savedLayout.layouts.md, newLayoutItem],
        sm: [...savedLayout.layouts.sm, { ...newLayoutItem, w: 6 }],
      },
      widgets: newWidgets,
    };

    saveLayoutMutation.mutate(newLayout);
  }, [savedLayout, saveLayoutMutation]);

  const removeWidget = useCallback((widgetId: string) => {
    if (!savedLayout) return;

    const newWidgets = savedLayout.widgets.filter(w => w.id !== widgetId);
    const newLayout: DashboardLayout = {
      layouts: {
        lg: savedLayout.layouts.lg.filter(l => l.i !== widgetId),
        md: savedLayout.layouts.md.filter(l => l.i !== widgetId),
        sm: savedLayout.layouts.sm.filter(l => l.i !== widgetId),
      },
      widgets: newWidgets,
    };

    saveLayoutMutation.mutate(newLayout);
  }, [savedLayout, saveLayoutMutation]);

  return {
    layout: savedLayout || DEFAULT_LAYOUT,
    isLoading,
    saveLayout,
    resetLayout,
    addWidget,
    removeWidget,
    isSaving: saveLayoutMutation.isPending,
  };
};
