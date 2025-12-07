import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdAccounts = (provider?: 'meta' | 'google', status?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ad-accounts', user?.id, provider, status],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Fetch all accounts that have AT LEAST ONE campaign (of any status)
      // We use !inner to exclude accounts with zero campaigns entirely.
      // Note: We only select 'status' from campaigns because impressions/spend are not columns on the campaigns table.
      let query = supabase
        .from('ad_accounts')
        .select(`
          *,
          integrations!inner(
            user_id,
            provider,
            status
          ),
          campaigns!inner(
            status
          )
        `)
        .eq('integrations.user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (provider) {
        query = query.eq('integrations.provider', provider);
      }

      // Execute query - this gets us all "valid" accounts (those with campaigns)
      const { data, error } = await query;

      if (error) throw error;

      // 2. Filter in Memory based on the specific status selected
      // This ensures we don't rely on complex PostgREST filtering that might be failing
      let filteredData = data;

      if (status) {
        if (status === 'WITH_SPEND') {
          // Fetch accounts that have spend by querying metrics table directly
          const { data: metricsWithSpend, error: spendError } = await supabase
            .from('metrics')
            .select(`
              campaign_id,
              campaigns!inner(
                ad_account_id
              )
            `)
            .gt('spend', 0);

          if (spendError) {
            console.error('Error fetching accounts with spend:', spendError);
          } else if (metricsWithSpend) {
            const spendAccountIds = new Set(
              metricsWithSpend.map((m: any) => m.campaigns?.ad_account_id).filter(Boolean)
            );
            filteredData = data.filter(account => spendAccountIds.has(account.id));
          }
        } else if (status === 'HAD_DELIVERY') {
          // Fallback: Since we can't easily check delivery (impressions/spend) without joining metrics table
          // (which is heavy), we filter by status that implies activity.
          // Or we could return all accounts with campaigns if the user wants to see "Veiculadas".
          // For now, let's assume ACTIVE or PAUSED campaigns might have delivery.
          filteredData = data.filter(account =>
            account.campaigns.some((c: any) => ['ACTIVE', 'PAUSED'].includes(c.status))
          );
        } else {
          // Show accounts that have at least one campaign with the matching status
          filteredData = data.filter(account =>
            account.campaigns.some((c: any) => c.status === status)
          );
        }
      }

      // 3. Deduplicate and Clean
      // Create a Map to ensure unique accounts by ID
      const uniqueAccounts = new Map();
      filteredData.forEach(account => {
        if (!uniqueAccounts.has(account.id)) {
          // Remove the campaigns array from the result we pass to the UI
          // so the UI just sees a clean AdAccount object
          const { campaigns, ...rest } = account;
          uniqueAccounts.set(account.id, rest);
        }
      });

      return Array.from(uniqueAccounts.values());
    },
    enabled: !!user?.id,
  });
};
