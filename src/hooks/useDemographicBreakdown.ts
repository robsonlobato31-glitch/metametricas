import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays } from 'date-fns';

interface AgeBreakdown {
  name: string;
  value: number;
  percentage: number;
}

interface GenderBreakdown {
  name: string;
  value: number;
  percentage: number;
}

export const useDemographicBreakdown = (periodDays: number = 30) => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['demographic-breakdown', user?.id, periodDays],
    queryFn: async () => {
      if (!user?.id) return { ageData: [], genderData: [] };

      const dateFrom = subDays(new Date(), periodDays).toISOString().split('T')[0];
      const dateTo = new Date().toISOString().split('T')[0];

      // Fetch age breakdown
      const { data: ageBreakdowns, error: ageError } = await supabase
        .from('metric_breakdowns')
        .select(`
          breakdown_value,
          impressions,
          clicks,
          spend,
          campaigns!inner(
            ad_accounts!inner(
              integrations!inner(user_id)
            )
          )
        `)
        .eq('breakdown_type', 'age')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .eq('campaigns.ad_accounts.integrations.user_id', user.id);

      if (ageError) {
        console.error('Error fetching age breakdowns:', ageError);
      }

      // Fetch gender breakdown
      const { data: genderBreakdowns, error: genderError } = await supabase
        .from('metric_breakdowns')
        .select(`
          breakdown_value,
          impressions,
          clicks,
          spend,
          campaigns!inner(
            ad_accounts!inner(
              integrations!inner(user_id)
            )
          )
        `)
        .eq('breakdown_type', 'gender')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .eq('campaigns.ad_accounts.integrations.user_id', user.id);

      if (genderError) {
        console.error('Error fetching gender breakdowns:', genderError);
      }

      // Aggregate age data
      const ageMap = new Map<string, number>();
      ageBreakdowns?.forEach((item: any) => {
        const existing = ageMap.get(item.breakdown_value) || 0;
        ageMap.set(item.breakdown_value, existing + (item.clicks || item.impressions || 0));
      });

      // Aggregate gender data
      const genderMap = new Map<string, number>();
      genderBreakdowns?.forEach((item: any) => {
        const genderLabel = item.breakdown_value === 'male' ? 'Masculino' 
          : item.breakdown_value === 'female' ? 'Feminino' 
          : 'Desconhecido';
        const existing = genderMap.get(genderLabel) || 0;
        genderMap.set(genderLabel, existing + (item.clicks || item.impressions || 0));
      });

      // Define age order for sorting
      const ageOrder = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

      // Convert to arrays with percentages
      const ageTotal = Array.from(ageMap.values()).reduce((acc, val) => acc + val, 0);
      const ageData: AgeBreakdown[] = Array.from(ageMap.entries())
        .sort((a, b) => {
          const indexA = ageOrder.indexOf(a[0]);
          const indexB = ageOrder.indexOf(b[0]);
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        })
        .map(([name, value]) => ({
          name,
          value,
          percentage: ageTotal > 0 ? (value / ageTotal) * 100 : 0,
        }));

      const genderTotal = Array.from(genderMap.values()).reduce((acc, val) => acc + val, 0);
      const genderData: GenderBreakdown[] = Array.from(genderMap.entries())
        .map(([name, value]) => ({
          name,
          value,
          percentage: genderTotal > 0 ? (value / genderTotal) * 100 : 0,
        }));

      return { ageData, genderData };
    },
    enabled: !!user?.id,
  });

  return {
    ageData: data?.ageData || [],
    genderData: data?.genderData || [],
    isLoading,
    hasData: (data?.ageData?.length || 0) > 0 || (data?.genderData?.length || 0) > 0,
  };
};
