import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';

export const usePlan = () => {
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: rolesLoading } = useUserRole();

  const { data, isLoading: planLoading, error } = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: planData, error: planError } = await supabase
        .rpc('get_user_plan', { p_user_id: user.id });

      if (planError) throw planError;

      // Buscar trial_ends_at separadamente
      const { data: planDetails, error: detailsError } = await supabase
        .from('user_plans')
        .select('trial_ends_at, stripe_customer_id, stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (detailsError) throw detailsError;

      return planData?.[0] ? {
        ...planData[0],
        trial_ends_at: planDetails?.trial_ends_at || null,
        stripe_customer_id: planDetails?.stripe_customer_id || null,
        stripe_subscription_id: planDetails?.stripe_subscription_id || null,
      } : null;
    },
    enabled: !!user?.id && !rolesLoading,
  });

  const isLoading = rolesLoading || planLoading;

  // Super Admin bypassa todos os limites
  if (isSuperAdmin && !rolesLoading) {
    return {
      plan_type: 'enterprise' as const,
      max_accounts: Infinity,
      accounts_used: data?.accounts_used || 0,
      can_add_account: true,
      is_at_limit: false,
      expires_at: null,
      status: 'active' as const,
      trial_ends_at: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      isLoading: false,
      error: null,
    };
  }

  return {
    plan_type: data?.plan_type || 'survival',
    max_accounts: data?.max_accounts || 2,
    accounts_used: data?.accounts_used || 0,
    can_add_account: data?.can_add_account || false,
    is_at_limit: data?.is_at_limit || false,
    expires_at: data?.expires_at,
    status: data?.status || 'active',
    trial_ends_at: data?.trial_ends_at,
    stripe_customer_id: data?.stripe_customer_id,
    stripe_subscription_id: data?.stripe_subscription_id,
    isLoading,
    error,
  };
};
