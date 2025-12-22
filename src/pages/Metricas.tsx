import { useState, useMemo } from 'react';
import { subDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { DollarSign, Target, Eye, Percent, ShoppingBag, MousePointerClick } from 'lucide-react';
import { toast } from 'sonner';

import { useCampaignMetrics } from '@/hooks/useCampaignMetrics';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDemographics } from '@/hooks/useDemographics';
import { useRegionBreakdown } from '@/hooks/useRegionBreakdown';
import { useTopCreatives } from '@/hooks/useTopCreatives';
import { useLastSync } from '@/hooks/useLastSync';
import { useFunnelData } from '@/hooks/useFunnelData';
import { supabase } from '@/integrations/supabase/client';

import { Header } from '@/components/dashboard/Header';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { FunnelChart } from '@/components/dashboard/FunnelChart';
import { TimelineChart } from '@/components/dashboard/TimelineChart';
import { DemographicsChart } from '@/components/dashboard/DemographicsChart';
import { RegionChart } from '@/components/dashboard/RegionChart';
import { VideoFunnel } from '@/components/dashboard/VideoFunnel';
import { CampaignTable } from '@/components/dashboard/CampaignTable';
import { CreativeTable } from '@/components/dashboard/CreativeTable';
import { LastSyncIndicator } from '@/components/dashboard/LastSyncIndicator';

import { KPI, FunnelStep, MetricLevel } from '@/components/dashboard/types';

export default function Metricas() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [selectedLevel, setSelectedLevel] = useState<MetricLevel>('campaign');
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [isSyncingCreatives, setIsSyncingCreatives] = useState(false);

  // Fetch daily metrics for timeline
  const { data: dailyMetrics, isLoading: dailyLoading } = useDailyMetrics(
    dateRange?.from,
    dateRange?.to,
    selectedAccountId,
    status
  );

  // Fetch campaign data (includes metrics)
  const { data: campaignsData, isLoading: campaignsLoading, error: campaignsError } = useCampaignMetrics({
    provider: 'meta',
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    accountId: selectedAccountId,
    status: status,
  });

  // Calculate totals from campaignsData
  const totals = useMemo(() => {
    const defaultTotals = {
      spend: 0, conversions: 0, impressions: 0, clicks: 0, link_clicks: 0,
      page_views: 0, initiated_checkout: 0, purchases: 0,
      video_views_25: 0, video_views_50: 0, video_views_75: 0, video_views_100: 0,
      results: 0, messages: 0, ctr: 0, cpc: 0, cost_per_result: 0, cost_per_message: 0, budget: 0, cpm: 0,
    };

    if (!campaignsData || !Array.isArray(campaignsData)) {
      return defaultTotals;
    }

    const aggregated = campaignsData.reduce((acc, curr) => ({
      budget: acc.budget + (curr.budget || 0),
      spend: acc.spend + (curr.spend || 0),
      conversions: acc.conversions + (curr.conversions || 0),
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      link_clicks: acc.link_clicks + (curr.link_clicks || 0),
      page_views: acc.page_views + (curr.page_views || 0),
      initiated_checkout: acc.initiated_checkout + (curr.initiated_checkout || 0),
      purchases: acc.purchases + (curr.purchases || 0),
      video_views_25: acc.video_views_25 + (curr.video_views_25 || 0),
      video_views_50: acc.video_views_50 + (curr.video_views_50 || 0),
      video_views_75: acc.video_views_75 + (curr.video_views_75 || 0),
      video_views_100: acc.video_views_100 + (curr.video_views_100 || 0),
      results: acc.results + (curr.results || 0),
      messages: acc.messages + (curr.messages || 0),
    }), {
      budget: 0, spend: 0, conversions: 0, impressions: 0, clicks: 0, link_clicks: 0,
      page_views: 0, initiated_checkout: 0, purchases: 0,
      video_views_25: 0, video_views_50: 0, video_views_75: 0, video_views_100: 0,
      results: 0, messages: 0
    });

    return {
      ...aggregated,
      ctr: aggregated.impressions > 0 ? (aggregated.clicks / aggregated.impressions) * 100 : 0,
      cpc: aggregated.clicks > 0 ? aggregated.spend / aggregated.clicks : 0,
      cpm: aggregated.impressions > 0 ? (aggregated.spend / aggregated.impressions) * 1000 : 0,
      cost_per_result: aggregated.results > 0 ? aggregated.spend / aggregated.results : 0,
      cost_per_message: aggregated.messages > 0 ? aggregated.spend / aggregated.messages : 0,
    };
  }, [campaignsData]);

  // Video Funnel Data
  const videoMetrics = useMemo(() => {
    const impressions = totals.impressions || 1; // Avoid division by zero
    const hasVideoData = totals.video_views_25 > 0 || totals.video_views_50 > 0 || 
                         totals.video_views_75 > 0 || totals.video_views_100 > 0;
    
    return [
      {
        label: 'VV 100%',
        percentage: (totals.video_views_100 / impressions) * 100,
        value: `${((totals.video_views_100 / impressions) * 100).toFixed(2)}%`,
        hasData: hasVideoData
      },
      {
        label: 'VV 75%',
        percentage: (totals.video_views_75 / impressions) * 100,
        value: `${((totals.video_views_75 / impressions) * 100).toFixed(2)}%`,
        hasData: hasVideoData
      },
      {
        label: 'VV 50%',
        percentage: (totals.video_views_50 / impressions) * 100,
        value: `${((totals.video_views_50 / impressions) * 100).toFixed(2)}%`,
        hasData: hasVideoData
      },
      {
        label: 'VV 25%',
        percentage: (totals.video_views_25 / impressions) * 100,
        value: `${((totals.video_views_25 / impressions) * 100).toFixed(2)}%`,
        hasData: hasVideoData
      },
    ];
  }, [totals]);

  // Check if we have video data
  const hasVideoData = useMemo(() => {
    return totals.video_views_25 > 0 || totals.video_views_50 > 0 || 
           totals.video_views_75 > 0 || totals.video_views_100 > 0;
  }, [totals]);

  // Fetch Demographics
  const { data: demographicsData, isLoading: demographicsLoading } = useDemographics(
    dateRange?.from,
    dateRange?.to,
    selectedAccountId === 'all' ? undefined : selectedAccountId,
    status
  );

  // Fetch Region Breakdown
  const { data: regionData, isLoading: regionLoading } = useRegionBreakdown(
    dateRange?.from,
    dateRange?.to,
    selectedAccountId === 'all' ? undefined : selectedAccountId,
    status
  );

  // Transform demographics for chart format
  const demographicChartData = useMemo(() => {
    if (!demographicsData?.age || demographicsData.age.length === 0) return [];
    
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    
    return (demographicsData.age as any[]).slice(0, 6).map((item: any, index: number) => ({
      name: item.breakdown_value,
      value: item.impressions || 0,
      color: colors[index % colors.length]
    }));
  }, [demographicsData]);

  // Fetch Top Creatives usando filtros globais de conta e status
  const { data: topCreatives, isLoading: creativesLoading } = useTopCreatives(
    dateRange?.from,
    dateRange?.to,
    selectedAccountId === 'all' ? undefined : selectedAccountId,
    status
  );

  // Fetch last sync info for metrics
  const { data: lastMetricsSync, isLoading: lastSyncLoading } = useLastSync('sync-meta-metrics');

  // Fetch real funnel data
  const { data: funnelMetrics, isLoading: funnelLoading } = useFunnelData({
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    provider: 'meta',
  });

  // Map creatives for table
  const creativeTableData = useMemo(() => {
    if (!topCreatives?.creatives) return [];
    return topCreatives.creatives.map(c => ({
      id: c.ad_id,
      name: c.ad_name,
      budget: 0,
      messages: c.messages || 0,
      cost_per_message: c.cost_per_message || 0,
      spend: c.spend || 0,
      ctr: c.ctr || 0,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
      creative_url: c.creative_url
    }));
  }, [topCreatives]);

  // Check if creatives need sync and mode
  const creativesNeedSync = topCreatives?.needsSync ?? false;
  const creativesMode = topCreatives?.mode ?? 'campaigns';

  // Sync creatives function
  const handleSyncCreatives = async () => {
    setIsSyncingCreatives(true);
    try {
      // First sync campaigns to get ads
      const { error: campaignsError } = await supabase.functions.invoke('sync-meta-campaigns');
      if (campaignsError) {
        console.error('Error syncing campaigns:', campaignsError);
        toast.error('Erro ao sincronizar campanhas');
        return;
      }
      
      // Then sync metrics
      const { error: metricsError } = await supabase.functions.invoke('sync-meta-metrics');
      if (metricsError) {
        console.error('Error syncing metrics:', metricsError);
        toast.error('Erro ao sincronizar métricas');
        return;
      }
      
      toast.success('Sincronização concluída!');
      // Refetch creatives data
      window.location.reload();
    } catch (error) {
      console.error('Error syncing creatives:', error);
      toast.error('Erro ao sincronizar');
    } finally {
      setIsSyncingCreatives(false);
    }
  };

  const isLoading = dailyLoading || campaignsLoading || demographicsLoading || regionLoading || creativesLoading || funnelLoading;
  const anyError = campaignsError;

  // Format functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Timeline Data - Real Data
  const timelineData = useMemo(() => {
    return dailyMetrics.map((day) => ({
      date: format(new Date(day.date), 'dd/MM'),
      spend: Number(day.spend),
      revenue: Number(day.revenue),
    }));
  }, [dailyMetrics]);

  // Campaign Data for Table
  const campaigns = useMemo(() => {
    if (!campaignsData || !Array.isArray(campaignsData) || campaignsData.length === 0) {
      return [];
    }

    return campaignsData.slice(0, 5).map(c => ({
      id: c.campaign_id || '',
      name: c.campaign_name || 'Sem nome',
      budget: c.budget || 0,
      messages: c.messages || 0,
      cost_per_message: c.cost_per_message || 0,
      spend: c.spend || 0,
      ctr: c.ctr || 0,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0
    }));
  }, [campaignsData]);

  // Funnel Data - Visão Geral metrics (moved above early returns to follow hooks rules)
  const funnelData: FunnelStep[] = useMemo(() => {
    return [
      {
        label: 'Orçamento',
        value: formatCurrency(totals.budget),
        subLabel: 'Total disponível',
      },
      {
        label: 'Mensagens',
        value: formatNumber(totals.messages),
        subLabel: 'Conversas iniciadas',
        percent: totals.budget > 0 ? `${((totals.spend / totals.budget) * 100).toFixed(1)}% gasto` : '0%',
      },
      {
        label: 'Custo/Msg',
        value: formatCurrency(totals.cost_per_message),
        subLabel: 'Custo médio',
      },
      {
        label: 'Gasto',
        value: formatCurrency(totals.spend),
        subLabel: 'Total investido',
        percent: totals.budget > 0 ? `${((totals.spend / totals.budget) * 100).toFixed(1)}%` : '0%',
      },
      {
        label: 'CTR',
        value: `${totals.ctr.toFixed(2)}%`,
        subLabel: 'Taxa de cliques',
      },
    ];
  }, [totals]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (anyError) {
    console.error('[Metricas] Error detected:', anyError);
    const errorMessage = anyError instanceof Error ? anyError.message : String(anyError);

    return (
      <div className="min-h-screen bg-dark-bg text-gray-200 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-4">
            <h3 className="text-red-400 font-bold mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-400 text-sm mb-2">Não foi possível carregar os dados.</p>
            <p className="text-gray-500 text-xs font-mono whitespace-pre-wrap">{errorMessage}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
          >
            Recarregar página
          </button>
        </div>
      </div>
    );
  }

  // Check if we have any data at all
  const hasAnyData = totals.impressions > 0 || totals.clicks > 0 || totals.spend > 0;

  if (!hasAnyData) {
    return (
      <div className="min-h-screen bg-dark-bg text-gray-200">
        <div className="max-w-[1920px] mx-auto p-6 md:p-8">
          <Header
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            provider="meta"
            status={status}
            onStatusChange={setStatus}
          />
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="bg-dark-card border border-dark-border rounded-xl p-8">
                <div className="text-gray-500 mb-4">
                  <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                </div>
                <h3 className="text-gray-300 font-bold mb-2">Nenhuma métrica encontrada</h3>
                <p className="text-gray-500 text-sm">
                  {selectedAccountId
                    ? 'Não há dados para a conta selecionada no período escolhido.'
                    : 'Não há métricas sincronizadas. Clique em "Sincronizar Métricas" para buscar dados.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // KPI Data
  const kpiData: KPI[] = [
    { label: 'Orçamento', value: formatCurrency(totals.budget), icon: DollarSign },
    { label: 'Mensagens', value: formatNumber(totals.messages), icon: ShoppingBag },
    { label: 'Custo/Mensagem', value: formatCurrency(totals.cost_per_message), icon: Target },
    { label: 'Gasto', value: formatCurrency(totals.spend), icon: DollarSign },
    { label: 'CTR', value: `${totals.ctr.toFixed(2)}%`, icon: Percent },
    { label: 'CPM', value: formatCurrency(totals.cpm), icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 font-sans selection:bg-brand-500/30 overflow-x-hidden">
      <main className="min-h-screen">
        <div className="max-w-[1920px] mx-auto p-6 md:p-8">
          <Header
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            provider="meta"
            status={status}
            onStatusChange={setStatus}
          />

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Métricas</h2>
            <LastSyncIndicator lastSyncAt={lastMetricsSync?.lastSyncAt} isLoading={lastSyncLoading} />
          </div>

          <div className="grid grid-cols-12 gap-6 animate-fade-in">
            {/* Left Column */}
            <div className="col-span-12 xl:col-span-5 flex flex-col gap-6">
              <KPIGrid data={kpiData} />
              <TimelineChart data={timelineData} />
              <CampaignTable data={campaigns} />
            </div>

            {/* Middle Column (Funnel) */}
            <div className="col-span-12 md:col-span-6 xl:col-span-3 flex flex-col h-full min-h-[600px] xl:min-h-0">
              <FunnelChart data={funnelData} />
            </div>

            {/* Right Column */}
            <div className="col-span-12 md:col-span-6 xl:col-span-4 flex flex-col gap-6">
              <DemographicsChart data={demographicChartData} />
              <RegionChart data={regionData?.regions || []} />
              {hasVideoData && <VideoFunnel metrics={videoMetrics} />}
              <CreativeTable 
                creatives={creativeTableData} 
                needsSync={creativesNeedSync}
                onSyncClick={handleSyncCreatives}
                isSyncing={isSyncingCreatives}
                mode={creativesMode}
                lastSyncAt={lastMetricsSync?.lastSyncAt}
                lastSyncLoading={lastSyncLoading}
              />
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-700 py-8 flex items-center justify-center gap-2">
            <span>Desenvolvimento</span>
            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
            <span className="font-bold text-gray-600">ROBSON LOBATO</span>
          </div>
        </div>
      </main>
    </div>
  );
}
