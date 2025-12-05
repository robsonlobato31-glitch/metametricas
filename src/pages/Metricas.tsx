import { useState, useMemo } from 'react';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { DollarSign, Target, TrendingUp, Eye, Percent, ShoppingBag } from 'lucide-react';

import { useMetrics } from '@/hooks/useMetrics';
import { useCampaignMetrics } from '@/hooks/useCampaignMetrics';
import { useAdSetMetrics } from '@/hooks/useAdSetMetrics';
import { useAdMetrics } from '@/hooks/useAdMetrics';

import { Header } from '@/components/dashboard/Header';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { FunnelChart } from '@/components/dashboard/FunnelChart';
import { TimelineChart } from '@/components/dashboard/TimelineChart';
import { DemographicsChart } from '@/components/dashboard/DemographicsChart';
import { VideoFunnel } from '@/components/dashboard/VideoFunnel';
import { CampaignTable } from '@/components/dashboard/CampaignTable';
import { CreativeTable } from '@/components/dashboard/CreativeTable';
import { UTMTable } from '@/components/dashboard/UTMTable';

import { KPI, FunnelStep, MetricLevel } from '@/components/dashboard/types';

export default function Metricas() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [selectedLevel, setSelectedLevel] = useState<MetricLevel>('campaign');
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);

  // Fetch data based on selected level and account
  const { totals: campaignTotals, isLoading: campaignLoading, error: campaignError } = useMetrics(
    dateRange?.from,
    dateRange?.to,
    selectedAccountId,
    'meta'
  );

  // TODO: Re-enable when ad_sets and ads tables are created
  // const { totals: adSetTotals, isLoading: adSetLoading, error: adSetError } = useAdSetMetrics(
  //   dateRange?.from,
  //   dateRange?.to,
  //   selectedAccountId
  // );

  // const { totals: adTotals, isLoading: adLoading, error: adError } = useAdMetrics(
  //   dateRange?.from,
  //   dateRange?.to,
  //   selectedAccountId
  // );

  // Temporary fallback values
  const adSetTotals = null;
  const adSetLoading = false;
  const adSetError = null;
  const adTotals = null;
  const adLoading = false;
  const adError = null;

  // Select the appropriate totals based on level
  const metricsTotals = selectedLevel === 'campaign'
    ? campaignTotals
    : selectedLevel === 'ad_set'
      ? adSetTotals
      : adTotals;

  const isLoading = selectedLevel === 'campaign'
    ? campaignLoading
    : selectedLevel === 'ad_set'
      ? adSetLoading
      : adLoading;

  const totals = metricsTotals || {
    spend: 0,
    conversions: 0,
    impressions: 0,
    clicks: 0,
    link_clicks: 0,
    page_views: 0,
    initiated_checkout: 0,
    purchases: 0,
    video_views_25: 0,
    video_views_50: 0,
    video_views_75: 0,
    video_views_100: 0,
    results: 0,
    messages: 0,
    ctr: 0,
    cpc: 0,
    cost_per_result: 0,
    cost_per_message: 0,
  };

  // Fetch campaign data for table
  const { data: campaignsData, isLoading: campaignsLoading, error: campaignsError } = useCampaignMetrics({
    provider: 'meta',
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    accountId: selectedAccountId,
  });

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

  // Timeline Data - MUST be before any conditional returns
  const timelineData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const avgSpend = totals.spend / days.length;

    return days.map((day) => ({
      date: format(day, 'dd/MM'),
      spend: Math.round(avgSpend * (0.8 + Math.random() * 0.4)),
      revenue: Math.round(avgSpend * 1.5 * (0.8 + Math.random() * 0.4)),
    }));
  }, [dateRange, totals]);

  // Campaign Data for Table - MUST be before any conditional returns
  const campaigns = useMemo(() => {
    if (!campaignsData || !Array.isArray(campaignsData) || campaignsData.length === 0) {
      return [];
    }

    return campaignsData.slice(0, 5).map(c => ({
      id: c.campaign_id || '',
      name: c.campaign_name || 'Sem nome',
      purchases: c.conversions || 0,
      ctr: c.ctr || 0,
      clicks: c.clicks || 0,
      roas: 0,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0
    }));
  }, [campaignsData]);

  // Debug logs
  console.log('[Metricas] Debug State:', {
    selectedLevel,
    selectedAccountId,
    isLoading: isLoading || campaignsLoading,
    campaignError,
    adSetError,
    adError,
    campaignsError,
    hasCampaignTotals: !!campaignTotals,
    hasAdSetTotals: !!adSetTotals,
    hasAdTotals: !!adTotals,
  });

  // Show loading state
  if (isLoading || campaignsLoading) {
    return (
      <div className="min-h-screen bg-dark-bg text-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  // Show error state for any hook
  const anyError = campaignError || adSetError || adError || campaignsError;
  if (anyError) {
    console.error('[Metricas] Error detected:', anyError);

    // Extract error message
    const errorMessage = anyError instanceof Error
      ? anyError.message
      : typeof anyError === 'object' && anyError !== null
        ? JSON.stringify(anyError, null, 2)
        : String(anyError);

    return (
      <div className="min-h-screen bg-dark-bg text-gray-200 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-4">
            <h3 className="text-red-400 font-bold mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-400 text-sm mb-2">
              Não foi possível carregar os dados. Por favor, tente novamente.
            </p>
            <p className="text-gray-500 text-xs font-mono whitespace-pre-wrap">
              {errorMessage}
            </p>
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
  const hasAnyData = metricsTotals && (
    metricsTotals.impressions > 0 ||
    metricsTotals.clicks > 0 ||
    metricsTotals.spend > 0
  );

  // Show empty state if no data
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
    { label: 'Investimento', value: formatCurrency(totals.spend), icon: DollarSign },
    { label: 'Resultado', value: formatNumber(totals.conversions), icon: ShoppingBag },
    { label: 'Custo/Resultado', value: formatCurrency(totals.conversions > 0 ? totals.spend / totals.conversions : 0), icon: Target },
    { label: 'Retorno', value: formatCurrency(0), icon: DollarSign },
    { label: 'CPM', value: formatCurrency(totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0), icon: Eye },
    { label: 'CTR', value: `${(totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0).toFixed(2)}%`, icon: Percent },
  ];

  // Funnel Data
  const funnelData: FunnelStep[] = [
    {
      label: 'Alcance',
      value: formatNumber(totals.impressions),
      subLabel: 'Pessoas alcançadas'
    },
    {
      label: 'Visualizações',
      value: formatNumber(Math.round(totals.impressions * 0.3)),
      subLabel: 'Visualizações de página',
      percent: '30%'
    },
    {
      label: 'Cliques',
      value: formatNumber(totals.clicks),
      subLabel: 'Cliques no link',
      percent: `${(totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0).toFixed(2)}%`
    },
    {
      label: 'Add Carrinho',
      value: formatNumber(Math.round(totals.clicks * 0.1)),
      subLabel: 'Adições ao carrinho',
      percent: '10%'
    },
    {
      label: 'Compras',
      value: formatNumber(totals.conversions),
      subLabel: 'Compras realizadas',
      percent: `${(totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0).toFixed(2)}%`
    },
  ];

  // Demographics Data
  const demographicsData = [
    { name: '18-24', value: 25, color: '#3b82f6' },
    { name: '25-34', value: 35, color: '#60a5fa' },
    { name: '35-44', value: 20, color: '#93c5fd' },
    { name: '45+', value: 20, color: '#bfdbfe' },
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
          />

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
              <DemographicsChart data={demographicsData} />
              <VideoFunnel />
              <CreativeTable creatives={[]} />
            </div>
          </div>

          <div className="mt-6">
            <UTMTable utm={[]} />
          </div>

          <div className="text-center text-[10px] text-gray-700 py-8 flex items-center justify-center gap-2">
            <span>Desenvolvimento</span>
            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
            <span className="font-bold text-gray-600">DASH PRO</span>
          </div>
        </div>
      </main>
    </div>
  );
}
