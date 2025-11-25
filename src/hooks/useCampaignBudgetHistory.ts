import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, eachDayOfInterval } from 'date-fns';

type CampaignWithMetrics = {
  id: string;
  name: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
  metrics: {
    date: string;
    spend: number;
  }[];
};

export const useCampaignBudgetHistory = (
  days: number = 30,
  fromDate?: Date,
  toDate?: Date
) => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaign-budget-history', user?.id, days, fromDate, toDate],
    queryFn: async () => {
      if (!user?.id) return [];

      const dateFrom = fromDate || subDays(new Date(), days);
      const dateTo = toDate || new Date();

      // Get all user's campaigns with budgets
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          daily_budget,
          lifetime_budget,
          ad_accounts!inner(
            integrations!inner(
              user_id
            )
          )
        `)
        .eq('ad_accounts.integrations.user_id', user.id)
        .not('daily_budget', 'is', null)
        .limit(10);

      if (campaignsError) throw campaignsError;

      if (!campaigns || campaigns.length === 0) return [];

      // Get metrics for each campaign
      const campaignsWithMetrics = await Promise.all(
        campaigns.map(async (campaign) => {
          const { data: metrics, error: metricsError } = await supabase
            .from('metrics')
            .select('date, spend')
            .eq('campaign_id', campaign.id)
            .gte('date', format(dateFrom, 'yyyy-MM-dd'))
            .lte('date', format(dateTo, 'yyyy-MM-dd'))
            .order('date', { ascending: true });

          if (metricsError) {
            console.error('Error fetching metrics:', metricsError);
            return {
              id: campaign.id,
              name: campaign.name,
              daily_budget: campaign.daily_budget,
              lifetime_budget: campaign.lifetime_budget,
              metrics: [],
            };
          }

          return {
            id: campaign.id,
            name: campaign.name,
            daily_budget: campaign.daily_budget,
            lifetime_budget: campaign.lifetime_budget,
            metrics: metrics || [],
          };
        })
      );

      return campaignsWithMetrics;
    },
    enabled: !!user?.id,
  });

  // Calculate aggregated daily spend across all campaigns
  const aggregatedData = () => {
    if (!data || data.length === 0) return [];

    const dateFrom = fromDate || subDays(new Date(), days);
    const dateTo = toDate || new Date();
    const allDates = eachDayOfInterval({ start: dateFrom, end: dateTo });

    return allDates.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      let totalSpend = 0;
      let totalBudget = 0;

      data.forEach((campaign) => {
        const metric = campaign.metrics.find((m) => m.date === dateStr);
        if (metric) {
          totalSpend += Number(metric.spend || 0);
        }
        if (campaign.daily_budget) {
          totalBudget += campaign.daily_budget;
        }
      });

      return {
        date: dateStr,
        spend: totalSpend,
        budget: totalBudget,
        displayDate: format(date, 'dd/MM'),
      };
    });
  };

  // Calculate per-campaign cumulative spend
  const campaignCumulativeData = () => {
    if (!data || data.length === 0) return [];

    return data.map((campaign) => {
      let cumulativeSpend = 0;
      const budget = campaign.daily_budget || campaign.lifetime_budget || 0;

      const metricsWithCumulative = campaign.metrics.map((metric) => {
        cumulativeSpend += Number(metric.spend || 0);
        const percentage = budget > 0 ? (cumulativeSpend / budget) * 100 : 0;

        return {
          date: metric.date,
          displayDate: format(new Date(metric.date), 'dd/MM'),
          spend: cumulativeSpend,
          budget,
          percentage,
        };
      });

      return {
        id: campaign.id,
        name: campaign.name,
        data: metricsWithCumulative,
        currentSpend: cumulativeSpend,
        budget,
        percentage: budget > 0 ? (cumulativeSpend / budget) * 100 : 0,
      };
    });
  };

  return {
    campaigns: data || [],
    aggregatedData: aggregatedData(),
    campaignCumulativeData: campaignCumulativeData(),
    isLoading,
    error,
  };
};
