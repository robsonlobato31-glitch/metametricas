import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LastSyncInfo {
  lastSyncAt: Date | null;
  status: string | null;
  metricsSynced: number | null;
}

export const useLastSync = (functionName: string) => {
  return useQuery({
    queryKey: ['last-sync', functionName],
    queryFn: async (): Promise<LastSyncInfo> => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('finished_at, status, metrics_synced')
        .eq('function_name', functionName)
        .eq('status', 'success')
        .order('finished_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching last sync:', error);
        return { lastSyncAt: null, status: null, metricsSynced: null };
      }

      return {
        lastSyncAt: data?.finished_at ? new Date(data.finished_at) : null,
        status: data?.status || null,
        metricsSynced: data?.metrics_synced || null,
      };
    },
    staleTime: 30000, // 30 seconds
  });
};
