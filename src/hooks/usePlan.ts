import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';

export const usePlan = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .rpc('get_user_plan', { p_user_id: user.id });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!user?.id,
  });

  // Super Admin bypassa todos os limites
  if (isSuperAdmin) {
    return {
      plan_type: 'enterprise' as const,
      max_accounts: Infinity,
      accounts_used: data?.accounts_used || 0,
      can_add_account: true,
      is_at_limit: false,
      expires_at: null,
      status: 'active' as const,
      isLoading: false,
      error: null,
    };
  }

  return {
    ...data,
    isLoading,
    error,
  };
};
