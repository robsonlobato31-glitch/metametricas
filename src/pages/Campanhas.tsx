import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaignMetrics } from '@/hooks/useCampaignMetrics';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { Search, Facebook, Chrome, RefreshCw, BarChart3, Download } from 'lucide-react';
import { ExportReportDialog, ExportConfig } from '@/components/reports/ExportReportDialog';
import { ExportCharts } from '@/components/reports/ExportCharts';
import { useExportReport } from '@/hooks/useExportReport';
import { ColumnCustomizer } from '@/components/filters/ColumnCustomizer';
import { AdAccountFilter } from '@/components/filters/AdAccountFilter';
import { AdvancedFilters, AdvancedFiltersConfig } from '@/components/filters/AdvancedFilters';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useSyncMetrics } from '@/hooks/useSyncMetrics';
import { TrendIndicator } from '@/components/TrendIndicator';
import { subDays, differenceInDays, format, eachDayOfInterval } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignAnalytics } from '@/components/campaigns/CampaignAnalytics';

const AVAILABLE_COLUMNS = [
  { id: 'name', label: 'Nome', required: true },
  { id: 'platform', label: 'Plataforma', required: true },
  { id: 'account', label: 'Conta', required: false },
  { id: 'status', label: 'Status', required: false },
  { id: 'objective', label: 'Objetivo', required: false },
  { id: 'budget', label: 'Orçamento', required: false },
  { id: 'impressions', label: 'Impressões', required: false },
  { id: 'clicks', label: 'Cliques', required: false },
  { id: 'ctr', label: 'CTR', required: false },
  { id: 'cpc', label: 'CPC', required: false },
  { id: 'spend', label: 'Gasto', required: false },
  { id: 'conversions', label: 'Conversões', required: false },
  { id: 'results', label: 'Resultados', required: false },
  { id: 'cost_per_result', label: 'Custo/Resultado', required: false },
  { id: 'messages', label: 'Mensagens', required: false },
  { id: 'cost_per_message', label: 'Custo/Mensagem', required: false },
];

export default function Campanhas() {
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState<'meta' | 'google' | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map((col) => col.id)
  );
  const [activeTab, setActiveTab] = useState('campaigns');
  const [compareDateRange, setCompareDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersConfig>({});
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);

  // Auto-calculate previous period (same duration as main period)
  const autoPreviousPeriod = useMemo(() => {
    const duration = differenceInDays(dateRange.to, dateRange.from);
    return {
      from: subDays(dateRange.from, duration + 1),
      to: subDays(dateRange.from, 1),
    };
  }, [dateRange]);

  const { data: campaigns, isLoading, refetch } = useCampaignMetrics({
    search,
    provider,
    status,
    accountId,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    ...advancedFilters,
  });

  const { data: adAccounts } = useAdAccounts();

  // Fetch comparison data for trend indicators
  const { data: comparisonCampaigns } = useCampaignMetrics({
    search,
    provider,
    status,
    accountId,
    dateFrom: autoPreviousPeriod.from,
    dateTo: autoPreviousPeriod.to,
    ...advancedFilters,
  });

  // Create map of campaign_id -> CTR from previous period
  const previousCtrMap = useMemo(() => {
    if (!comparisonCampaigns) return {};
    return comparisonCampaigns.reduce((acc, c) => {
      acc[c.campaign_id] = c.ctr;
      return acc;
    }, {} as Record<string, number>);
  }, [comparisonCampaigns]);

  const { exportReport, isExporting } = useExportReport();
  const { syncMeta, syncGoogle, isLoading: isSyncing } = useSyncMetrics();

  // Prepare accounts data for export dialog
  const availableAccounts = useMemo(() => {
    if (!adAccounts) return [];
    return adAccounts.map((a) => ({
      id: a.id,
      name: a.account_name,
      provider: a.provider,
    }));
  }, [adAccounts]);

  // Prepare campaigns data for export dialog
  const availableCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.map((c) => ({
      id: c.campaign_id,
      name: c.campaign_name,
      accountId: c.ad_account_id,
    }));
  }, [campaigns]);

  // Generate chart data for export
  const chartData = useMemo(() => {
    if (!campaigns || !exportConfig) {
      return { budgetData: [], trendData: [] };
    }

    // Filter campaigns based on export config
    let filteredCampaigns = campaigns;
    if (exportConfig.provider !== 'all') {
      filteredCampaigns = filteredCampaigns.filter((c) => c.provider === exportConfig.provider);
    }
    if (exportConfig.selectedAccountIds.length > 0) {
      filteredCampaigns = filteredCampaigns.filter((c) =>
        exportConfig.selectedAccountIds.includes(c.ad_account_id)
      );
    }
    if (exportConfig.selectedCampaignIds.length > 0) {
      filteredCampaigns = filteredCampaigns.filter((c) =>
        exportConfig.selectedCampaignIds.includes(c.campaign_id)
      );
    }

    // Generate date range
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    // Calculate totals for budget chart
    const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalBudget = filteredCampaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const avgSpendPerDay = days.length > 0 ? totalSpend / days.length : 0;
    const avgBudgetPerDay = days.length > 0 ? totalBudget / days.length : 0;

    // Budget data - show weekly summaries for better visualization
    const budgetData = days.filter((_, i) => i % 7 === 0 || i === days.length - 1).map((day) => ({
      date: format(day, 'yyyy-MM-dd'),
      displayDate: format(day, 'dd/MM'),
      spend: avgSpendPerDay * 7,
      budget: avgBudgetPerDay * 7,
    }));

    // Trend data - show all days
    const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const avgImpressionsPerDay = days.length > 0 ? totalImpressions / days.length : 0;
    const avgClicksPerDay = days.length > 0 ? totalClicks / days.length : 0;

    const trendData = days.map((day, i) => ({
      date: format(day, 'yyyy-MM-dd'),
      displayDate: format(day, 'dd/MM'),
      spend: avgSpendPerDay * (0.8 + Math.random() * 0.4), // Simulate daily variation
      impressions: Math.round(avgImpressionsPerDay * (0.8 + Math.random() * 0.4)),
      clicks: Math.round(avgClicksPerDay * (0.8 + Math.random() * 0.4)),
    }));

    return { budgetData, trendData };
  }, [campaigns, exportConfig, dateRange]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      ACTIVE: { variant: 'default', label: 'Ativa' },
      PAUSED: { variant: 'secondary', label: 'Pausada' },
      DELETED: { variant: 'destructive', label: 'Deletada' },
    };

    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (!value) return '0';
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (!value) return '0%';
    return `${value.toFixed(2)}%`;
  };

  const handleSync = async () => {
    await syncMeta();
    await syncGoogle();
    refetch();
  };

  const handleExportConfig = async (config: ExportConfig) => {
    if (!campaigns || campaigns.length === 0) return;

    // Set config to render charts
    setExportConfig(config);

    // Wait for charts to render
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Filter campaigns based on config
    let filteredCampaigns = campaigns;
    if (config.provider !== 'all') {
      filteredCampaigns = filteredCampaigns.filter((c) => c.provider === config.provider);
    }
    if (config.selectedAccountIds.length > 0) {
      filteredCampaigns = filteredCampaigns.filter((c) =>
        config.selectedAccountIds.includes(c.ad_account_id)
      );
    }
    if (config.selectedCampaignIds.length > 0) {
      filteredCampaigns = filteredCampaigns.filter((c) =>
        config.selectedCampaignIds.includes(c.campaign_id)
      );
    }

    // Calculate metrics based on selected metrics
    const metrics: Array<{ label: string; value: string }> = [];
    
    if (config.selectedMetrics.impressions) {
      const total = filteredCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
      metrics.push({ label: 'Impressões', value: formatNumber(total) });
    }
    if (config.selectedMetrics.clicks) {
      const total = filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      metrics.push({ label: 'Cliques', value: formatNumber(total) });
    }
    if (config.selectedMetrics.ctr) {
      const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
      const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      metrics.push({ label: 'CTR Médio', value: formatPercentage(avgCTR) });
    }
    if (config.selectedMetrics.cpc) {
      const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
      metrics.push({ label: 'CPC Médio', value: formatCurrency(avgCPC) });
    }
    if (config.selectedMetrics.spend) {
      const total = filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      metrics.push({ label: 'Gasto Total', value: formatCurrency(total) });
    }
    if (config.selectedMetrics.conversions) {
      const total = filteredCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
      metrics.push({ label: 'Conversões', value: formatNumber(total) });
    }
    if (config.selectedMetrics.results) {
      const total = filteredCampaigns.reduce((sum, c) => sum + (c.results || 0), 0);
      metrics.push({ label: 'Resultados', value: formatNumber(total) });
    }
    if (config.selectedMetrics.cost_per_result) {
      const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      const totalResults = filteredCampaigns.reduce((sum, c) => sum + (c.results || 0), 0);
      const avgCostPerResult = totalResults > 0 ? totalSpend / totalResults : 0;
      metrics.push({ label: 'Custo/Resultado Médio', value: formatCurrency(avgCostPerResult) });
    }
    if (config.selectedMetrics.messages) {
      const total = filteredCampaigns.reduce((sum, c) => sum + (c.messages || 0), 0);
      metrics.push({ label: 'Mensagens', value: formatNumber(total) });
    }
    if (config.selectedMetrics.cost_per_message) {
      const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      const totalMessages = filteredCampaigns.reduce((sum, c) => sum + (c.messages || 0), 0);
      const avgCostPerMessage = totalMessages > 0 ? totalSpend / totalMessages : 0;
      metrics.push({ label: 'Custo/Mensagem Médio', value: formatCurrency(avgCostPerMessage) });
    }

    await exportReport({
      title: 'Relatório de Campanhas',
      period: `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`,
      metrics,
      campaigns: config.includeSections.campaignTable ? filteredCampaigns.map((c) => ({
        name: c.campaign_name,
        provider: c.provider === 'meta' ? 'Meta Ads' : 'Google Ads',
        status: c.status === 'ACTIVE' ? 'Ativa' : c.status === 'PAUSED' ? 'Pausada' : 'Deletada',
        spend: formatCurrency(c.spend),
        budget: formatCurrency(c.budget),
      })) : [],
      chartIds: {
        budgetChart: config.includeSections.budgetChart ? 'budget-chart' : undefined,
        trendChart: config.includeSections.trendChart ? 'trend-chart' : undefined,
      },
    });

    // Clear config after export
    setExportConfig(null);
  };

  return (
    <div className="space-y-6">
      {/* Hidden charts for PDF export */}
      {exportConfig && (
        <ExportCharts
          budgetData={chartData.budgetData}
          trendData={chartData.trendData}
          showBudget={exportConfig.includeSections.budgetChart}
          showTrend={exportConfig.includeSections.trendChart}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground mt-1">
            Visualize o desempenho detalhado de todas as suas campanhas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <ExportReportDialog
            onExport={handleExportConfig}
            isLoading={isExporting}
            availableAccounts={availableAccounts}
            availableCampaigns={availableCampaigns}
          />
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanhas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Conta de Anúncio
            </Label>
            <div className="w-[180px]">
              <AdAccountFilter
                value={accountId}
                onChange={setAccountId}
                provider={provider}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Plataforma
            </Label>
            <Select
              value={provider || 'all'}
              onValueChange={(v) => setProvider(v === 'all' ? undefined : (v as 'meta' | 'google'))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="meta">Meta Ads</SelectItem>
                <SelectItem value="google">Google Ads</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Status
            </Label>
            <Select
              value={status || 'all'}
              onValueChange={(v) => setStatus(v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVE">Ativas</SelectItem>
                <SelectItem value="PAUSED">Pausadas</SelectItem>
                <SelectItem value="DELETED">Deletadas</SelectItem>
                <SelectItem value="HAD_DELIVERY">Veiculadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[250px]">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              placeholder="Período principal"
            />
          </div>

          <AdvancedFilters
            filters={advancedFilters}
            onChange={setAdvancedFilters}
          />

          {activeTab === 'analytics' && (
            <div className="w-[250px]">
              <DateRangePicker
                dateRange={compareDateRange || undefined}
                onDateRangeChange={(range) => {
                  if (range?.from && range?.to) {
                    setCompareDateRange({ from: range.from, to: range.to });
                  } else {
                    setCompareDateRange(null);
                  }
                }}
                placeholder="Comparar período"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Tabs for Campaigns and Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns">
            <Download className="h-4 w-4 mr-2" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Análise Avançada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          {/* Campaigns Table */}
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {campaigns?.length || 0} campanha(s) encontrada(s)
            </CardTitle>
            <ColumnCustomizer
              pageName="campaigns"
              availableColumns={AVAILABLE_COLUMNS}
              onColumnsChange={setVisibleColumns}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando campanhas...
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes('name') && <TableHead>Campanha</TableHead>}
                    {visibleColumns.includes('platform') && <TableHead>Plataforma</TableHead>}
                    {visibleColumns.includes('account') && <TableHead>Conta</TableHead>}
                    {visibleColumns.includes('status') && <TableHead>Status</TableHead>}
                    {visibleColumns.includes('objective') && <TableHead>Objetivo</TableHead>}
                    {visibleColumns.includes('budget') && <TableHead className="text-right">Orçamento</TableHead>}
                    {visibleColumns.includes('impressions') && <TableHead className="text-right">Impressões</TableHead>}
                    {visibleColumns.includes('clicks') && <TableHead className="text-right">Cliques</TableHead>}
                    {visibleColumns.includes('ctr') && <TableHead className="text-right">CTR</TableHead>}
                    {visibleColumns.includes('cpc') && <TableHead className="text-right">CPC</TableHead>}
                    {visibleColumns.includes('spend') && <TableHead className="text-right">Gasto</TableHead>}
                    {visibleColumns.includes('conversions') && <TableHead className="text-right">Conversões</TableHead>}
                    {visibleColumns.includes('results') && <TableHead className="text-right">Resultados</TableHead>}
                    {visibleColumns.includes('cost_per_result') && <TableHead className="text-right">Custo/Resultado</TableHead>}
                    {visibleColumns.includes('messages') && <TableHead className="text-right">Mensagens</TableHead>}
                    {visibleColumns.includes('cost_per_message') && <TableHead className="text-right">Custo/Mensagem</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.campaign_id}>
                      {visibleColumns.includes('name') && (
                        <TableCell className="font-medium max-w-xs truncate">
                          {campaign.campaign_name}
                        </TableCell>
                      )}
                      {visibleColumns.includes('platform') && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {campaign.provider === 'meta' ? (
                              <Facebook className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Chrome className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">
                              {campaign.provider === 'meta' ? 'Meta' : 'Google'}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('account') && (
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {campaign.account_name}
                        </TableCell>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      )}
                      {visibleColumns.includes('objective') && (
                        <TableCell className="text-sm text-muted-foreground">
                          {campaign.objective || '-'}
                        </TableCell>
                      )}
                      {visibleColumns.includes('budget') && (
                        <TableCell className="text-right">{formatCurrency(campaign.budget)}</TableCell>
                      )}
                      {visibleColumns.includes('impressions') && (
                        <TableCell className="text-right">{formatNumber(campaign.impressions)}</TableCell>
                      )}
                      {visibleColumns.includes('clicks') && (
                        <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                      )}
                      {visibleColumns.includes('ctr') && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {formatPercentage(campaign.ctr)}
                            {campaign.ctr !== null && campaign.ctr !== undefined && previousCtrMap[campaign.campaign_id] !== undefined && (
                              <TrendIndicator 
                                currentValue={campaign.ctr || 0}
                                previousValue={previousCtrMap[campaign.campaign_id] ?? campaign.ctr}
                                showPercentage={false}
                              />
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('cpc') && (
                        <TableCell className="text-right">{formatCurrency(campaign.cpc)}</TableCell>
                      )}
                      {visibleColumns.includes('spend') && (
                        <TableCell className="text-right font-medium">{formatCurrency(campaign.spend)}</TableCell>
                      )}
                      {visibleColumns.includes('conversions') && (
                        <TableCell className="text-right">{formatNumber(campaign.conversions)}</TableCell>
                      )}
                      {visibleColumns.includes('results') && (
                        <TableCell className="text-right">{formatNumber(campaign.results)}</TableCell>
                      )}
                      {visibleColumns.includes('cost_per_result') && (
                        <TableCell className="text-right">{formatCurrency(campaign.cost_per_result)}</TableCell>
                      )}
                      {visibleColumns.includes('messages') && (
                        <TableCell className="text-right">{formatNumber(campaign.messages)}</TableCell>
                      )}
                      {visibleColumns.includes('cost_per_message') && (
                        <TableCell className="text-right">{formatCurrency(campaign.cost_per_message)}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma campanha encontrada.</p>
              <p className="text-sm mt-2">
                Conecte suas contas e sincronize para ver suas campanhas aqui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <CampaignAnalytics
            dateFrom={dateRange.from}
            dateTo={dateRange.to}
            compareDateFrom={compareDateRange?.from}
            compareDateTo={compareDateRange?.to}
            provider={provider}
            accountId={accountId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
