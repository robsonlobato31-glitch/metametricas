import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

type CampaignAlert = {
  id: string;
  campaign_id: string;
  alert_type: string;
  threshold_amount: number;
  current_amount: number;
  is_active: boolean;
  triggered_at: string;
  resolved_at: string | null;
  created_at: string;
};

export const useRealtimeAlerts = () => {
  const { user } = useAuth();
  const [newAlertsCount, setNewAlertsCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Setting up realtime alerts listener for user:', user.id);

    const channel = supabase
      .channel('campaign-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_alerts',
        },
        async (payload) => {
          console.log('🚨 New alert received:', payload);
          
          const newAlert = payload.new as CampaignAlert;

          // Verify this alert belongs to the current user by checking the campaign ownership
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('name, ad_accounts!inner(integrations!inner(user_id))')
            .eq('id', newAlert.campaign_id)
            .single();

          // @ts-ignore - nested relations
          if (campaign?.ad_accounts?.integrations?.user_id === user.id) {
            const formatCurrency = (value: number) => {
              return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(value);
            };

            // Show toast notification
            toast.error('⚠️ Alerta de Orçamento!', {
              description: `Campanha "${campaign.name}" excedeu o limite de ${formatCurrency(
                newAlert.threshold_amount
              )}. Gasto atual: ${formatCurrency(newAlert.current_amount)}`,
              duration: 10000,
              action: {
                label: 'Ver Alertas',
                onClick: () => {
                  window.location.href = '/alerta-gasto';
                },
              },
            });

            // Increment new alerts count
            setNewAlertsCount((prev) => prev + 1);

            console.log('✅ Alert notification shown for campaign:', campaign.name);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime channel status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from realtime alerts');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const clearNewAlertsCount = () => {
    setNewAlertsCount(0);
  };

  return {
    newAlertsCount,
    clearNewAlertsCount,
  };
};
