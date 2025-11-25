import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdAccounts = (provider?: 'meta' | 'google') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ad-accounts', user?.id, provider],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('ad_accounts')
        .select(`
          *,
          integrations!inner(
            user_id,
            provider,
            status
          )
        `)
        .eq('integrations.user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (provider) {
        query = query.eq('integrations.provider', provider);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};
