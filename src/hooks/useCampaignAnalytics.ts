import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';

interface AnalyticsFilters {
  provider?: 'meta' | 'google';
  accountId?: string;
  dateFrom: Date;
  dateTo: Date;
  compareDateFrom?: Date;
  compareDateTo?: Date;
}

interface DailyMetric {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  results: number;
}

interface CampaignROI {
  campaign_id: string;
  campaign_name: string;
  provider: string;
  spend: number;
  conversions: number;
  results: number;
  roi: number;
  roas: number;
}

export const useCampaignAnalytics = (filters: AnalyticsFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['campaign-analytics', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get campaigns
      let campaignQuery = supabase
        .from('campaigns')
        .select(`
          *,
          ad_accounts!inner(
            id,
            account_name,
            provider,
            integrations!inner(user_id)
          )
        `)
        .eq('ad_accounts.integrations.user_id', user.id);

      if (filters.provider) {
        campaignQuery = campaignQuery.eq('ad_accounts.provider', filters.provider);
      }

      if (filters.accountId) {
        campaignQuery = campaignQuery.eq('ad_account_id', filters.accountId);
      }

      const { data: campaigns, error: campError } = await campaignQuery;
      if (campError) throw campError;

      const campaignIds = campaigns.map(c => c.id);

      // Get metrics for main period
      const { data: mainMetrics, error: mainError } = await supabase
        .from('metrics')
        .select('*')
        .in('campaign_id', campaignIds)
        .gte('date', format(startOfDay(filters.dateFrom), 'yyyy-MM-dd'))
        .lte('date', format(endOfDay(filters.dateTo), 'yyyy-MM-dd'))
        .order('date');

      if (mainError) throw mainError;

      // Get metrics for comparison period if provided
      let compareMetrics = null;
      if (filters.compareDateFrom && filters.compareDateTo) {
        const { data: compData } = await supabase
          .from('metrics')
          .select('*')
          .in('campaign_id', campaignIds)
          .gte('date', format(startOfDay(filters.compareDateFrom), 'yyyy-MM-dd'))
          .lte('date', format(endOfDay(filters.compareDateTo), 'yyyy-MM-dd'))
          .order('date');
        
        compareMetrics = compData;
      }

      // Process daily trends
      const daysInPeriod = eachDayOfInterval({ 
        start: filters.dateFrom, 
        end: filters.dateTo 
      });

      const dailyTrends: DailyMetric[] = daysInPeriod.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayMetrics = mainMetrics?.filter(m => m.date === dayStr) || [];
        
        return {
          date: format(day, 'dd/MM'),
          spend: dayMetrics.reduce((sum, m) => sum + (m.spend || 0), 0),
          impressions: dayMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0),
          clicks: dayMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0),
          conversions: dayMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0),
          results: dayMetrics.reduce((sum, m) => sum + (m.results || 0), 0),
        };
      });

      // Process comparison trends if available
      let comparisonTrends: DailyMetric[] | null = null;
      if (compareMetrics && filters.compareDateFrom && filters.compareDateTo) {
        const compareDays = eachDayOfInterval({ 
          start: filters.compareDateFrom, 
          end: filters.compareDateTo 
        });

        comparisonTrends = compareDays.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayMetrics = compareMetrics?.filter(m => m.date === dayStr) || [];
          
          return {
            date: format(day, 'dd/MM'),
            spend: dayMetrics.reduce((sum, m) => sum + (m.spend || 0), 0),
            impressions: dayMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0),
            clicks: dayMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0),
            conversions: dayMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0),
            results: dayMetrics.reduce((sum, m) => sum + (m.results || 0), 0),
          };
        });
      }

      // Calculate ROI per campaign
      const campaignROI: CampaignROI[] = campaigns.map(campaign => {
        const campMetrics = mainMetrics?.filter(m => m.campaign_id === campaign.id) || [];
        
        const totalSpend = campMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
        const totalConversions = campMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
        const totalResults = campMetrics.reduce((sum, m) => sum + (m.results || 0), 0);
        
        // Assuming average conversion value of R$ 100 for ROI calculation
        const avgConversionValue = 100;
        const revenue = totalConversions * avgConversionValue;
        const roi = totalSpend > 0 ? ((revenue - totalSpend) / totalSpend) * 100 : 0;
        const roas = totalSpend > 0 ? revenue / totalSpend : 0;

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          provider: campaign.ad_accounts.provider,
          spend: totalSpend,
          conversions: totalConversions,
          results: totalResults,
          roi,
          roas,
        };
      }).filter(c => c.spend > 0).sort((a, b) => b.roi - a.roi).slice(0, 10);

      // Calculate totals for comparison
      const mainTotals = {
        spend: mainMetrics?.reduce((sum, m) => sum + (m.spend || 0), 0) || 0,
        impressions: mainMetrics?.reduce((sum, m) => sum + (m.impressions || 0), 0) || 0,
        clicks: mainMetrics?.reduce((sum, m) => sum + (m.clicks || 0), 0) || 0,
        conversions: mainMetrics?.reduce((sum, m) => sum + (m.conversions || 0), 0) || 0,
        results: mainMetrics?.reduce((sum, m) => sum + (m.results || 0), 0) || 0,
      };

      let compareTotals = null;
      if (compareMetrics) {
        compareTotals = {
          spend: compareMetrics?.reduce((sum, m) => sum + (m.spend || 0), 0) || 0,
          impressions: compareMetrics?.reduce((sum, m) => sum + (m.impressions || 0), 0) || 0,
          clicks: compareMetrics?.reduce((sum, m) => sum + (m.clicks || 0), 0) || 0,
          conversions: compareMetrics?.reduce((sum, m) => sum + (m.conversions || 0), 0) || 0,
          results: compareMetrics?.reduce((sum, m) => sum + (m.results || 0), 0) || 0,
        };
      }

      return {
        dailyTrends,
        comparisonTrends,
        campaignROI,
        mainTotals,
        compareTotals,
      };
    },
    enabled: !!user?.id && !!filters.dateFrom && !!filters.dateTo,
  });
};
