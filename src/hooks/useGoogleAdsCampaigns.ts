import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GoogleAdsCampaign {
    id: string;
    campaign_id: string;
    name: string;
    status: string;
    objective: string;
    daily_budget: number | null;
    start_date: string | null;
    end_date: string | null;
    ad_accounts: {
        account_name: string;
        currency: string;
    };
    metrics: {
        impressions: number;
        clicks: number;
        spend: number;
        conversions: number;
        ctr: number;
        cpc: number;
        video_views: number;
        video_view_rate: number;
        date: string;
    }[];
}

export const useGoogleAdsCampaigns = (filters?: {
    status?: string;
    search?: string;
    dateRange?: { from: Date; to: Date };
}) => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['google-ads-campaigns', user?.id, filters],
        queryFn: async () => {
            if (!user?.id) return [];

            let query = supabase
                .from('campaigns')
                .select(`
          *,
          ad_accounts!inner(
            account_name,
            currency,
            provider
          ),
          metrics(
            impressions,
            clicks,
            spend,
            conversions,
            ctr,
            cpc,
            video_views,
            video_view_rate,
            date
          )
        `)
                .eq('ad_accounts.provider', 'google')
                .order('created_at', { ascending: false });

            if (filters?.status && filters.status !== 'all') {
                query = query.eq('status', filters.status);
            }

            if (filters?.search) {
                query = query.ilike('name', `%${filters.search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Filtrar métricas por data se necessário
            const campaigns = (data as any[]).map(campaign => {
                let metrics = campaign.metrics || [];

                if (filters?.dateRange?.from && filters?.dateRange?.to) {
                    const from = filters.dateRange.from.toISOString().split('T')[0];
                    const to = filters.dateRange.to.toISOString().split('T')[0];

                    metrics = metrics.filter((m: any) =>
                        m.date >= from && m.date <= to
                    );
                }

                // Ordenar métricas por data
                metrics.sort((a: any, b: any) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                return {
                    ...campaign,
                    metrics
                };
            });

            return campaigns as GoogleAdsCampaign[];
        },
        enabled: !!user?.id,
    });
};
