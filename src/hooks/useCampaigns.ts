import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useCampaigns = (filters?: {
  provider?: 'meta' | 'google';
  status?: string;
  search?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['campaigns', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('campaigns')
        .select(`
          *,
          ad_accounts!inner(
            account_name,
            provider,
            integrations!inner(user_id)
          )
        `)
        .eq('ad_accounts.integrations.user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.provider) {
        query = query.eq('ad_accounts.provider', filters.provider);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};
