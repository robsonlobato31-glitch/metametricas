import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { DateRangePicker } from '@/components/DateRangePicker';
import { SyncMetricsButton } from '@/components/SyncMetricsButton';
import { ExportReportButton } from '@/components/reports/ExportReportButton';
import { useMetrics } from '@/hooks/useMetrics';
import { useMetricBreakdowns, type BreakdownType } from '@/hooks/useMetricBreakdowns';
import { useExportReport } from '@/hooks/useExportReport';
import { BreakdownFilter } from '@/components/filters/BreakdownFilter';
import { ColumnCustomizer } from '@/components/filters/ColumnCustomizer';
import { subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

const AVAILABLE_COLUMNS = [
  { id: 'spend', label: 'Total Gasto', required: true },
  { id: 'impressions', label: 'Impressões', required: false },
  { id: 'clicks', label: 'Cliques', required: false },
  { id: 'conversions', label: 'Conversões', required: false },
  { id: 'ctr', label: 'CTR', required: false },
  { id: 'cpc', label: 'CPC', required: false },
  { id: 'results', label: 'Resultados', required: false },
  { id: 'cost_per_result', label: 'Custo por Resultado', required: false },
  { id: 'messages', label: 'Mensagens', required: false },
  { id: 'cost_per_message', label: 'Custo por Mensagem', required: false },
];

export default function Metricas() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [breakdownType, setBreakdownType] = useState<BreakdownType | undefined>(undefined);
  const [breakdownValue, setBreakdownValue] = useState<string | undefined>(undefined);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map((col) => col.id)
  );

  const { data: metrics, totals, metaMetrics, googleMetrics, isLoading, error } = useMetrics(
    dateRange?.from,
    dateRange?.to
  );

  const { data: breakdowns, isLoading: isLoadingBreakdowns } = useMetricBreakdowns({
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
    breakdownType,
  });

  const { exportReport, isExporting } = useExportReport();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const breakdownAggregates = breakdownValue && breakdowns
    ? breakdowns
        .filter((b) => !breakdownValue || b.breakdown_value === breakdownValue)
        .reduce(
          (acc, b) => ({
            impressions: acc.impressions + b.impressions,
            clicks: acc.clicks + b.clicks,
            spend: acc.spend + b.spend,
            conversions: acc.conversions + b.conversions,
            results: acc.results + b.results,
            messages: acc.messages + b.messages,
          }),
          { impressions: 0, clicks: 0, spend: 0, conversions: 0, results: 0, messages: 0 }
        )
    : null;

  // Calculate averages for breakdown aggregates
  const displayTotals = breakdownAggregates 
    ? {
        ...breakdownAggregates,
        avgCtr: breakdownAggregates.impressions > 0 
          ? (breakdownAggregates.clicks / breakdownAggregates.impressions) * 100 
          : 0,
        avgCpc: breakdownAggregates.clicks > 0 
          ? breakdownAggregates.spend / breakdownAggregates.clicks 
          : 0,
        avgCostPerResult: breakdownAggregates.results > 0 
          ? breakdownAggregates.spend / breakdownAggregates.results 
          : 0,
        avgCostPerMessage: breakdownAggregates.messages > 0 
          ? breakdownAggregates.spend / breakdownAggregates.messages 
          : 0,
      }
    : totals;

  const handleExport = async () => {
    const period = dateRange?.from && dateRange?.to
      ? `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`
      : 'Últimos 30 dias';

    const avgCtr = 'avgCtr' in displayTotals ? displayTotals.avgCtr : 0;
    const avgCpc = 'avgCpc' in displayTotals ? displayTotals.avgCpc : 0;

    await exportReport({
      title: 'Relatório de Métricas',
      period,
      metrics: [
        { label: 'Gasto Total', value: formatCurrency(displayTotals.spend) },
        { label: 'Impressões', value: formatNumber(displayTotals.impressions) },
        { label: 'Cliques', value: formatNumber(displayTotals.clicks) },
        { label: 'CTR Médio', value: `${(avgCtr || 0).toFixed(2)}%` },
        { label: 'CPC Médio', value: formatCurrency(avgCpc || 0) },
      ],
      campaigns: [],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas</h1>
          <p className="text-muted-foreground mt-1">
            Visualize o desempenho consolidado das suas campanhas com segmentação
          </p>
        </div>
        <div className="flex gap-2">
          <SyncMetricsButton />
          <ExportReportButton onClick={handleExport} isLoading={isExporting} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros e Segmentação</CardTitle>
              <CardDescription>Filtre e segmente suas métricas</CardDescription>
            </div>
            <ColumnCustomizer
              pageName="metrics"
              availableColumns={AVAILABLE_COLUMNS}
              onColumnsChange={setVisibleColumns}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            placeholder="Selecione o período"
          />
          <BreakdownFilter
            breakdownType={breakdownType}
            breakdownValue={breakdownValue}
            onBreakdownTypeChange={setBreakdownType}
            onBreakdownValueChange={setBreakdownValue}
          />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Erro ao carregar métricas.</AlertDescription>
        </Alert>
      )}

      {!metrics || metrics.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma métrica disponível. Sincronize suas campanhas.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {visibleColumns.map((colId) => {
            const column = AVAILABLE_COLUMNS.find((c) => c.id === colId);
            if (!column) return null;

            let value = '';

            switch (colId) {
              case 'spend':
                value = formatCurrency(displayTotals.spend);
                break;
              case 'impressions':
                value = formatNumber(displayTotals.impressions);
                break;
              case 'clicks':
                value = formatNumber(displayTotals.clicks);
                break;
              case 'conversions':
                value = formatNumber(displayTotals.conversions);
                break;
              case 'ctr':
                value = `${('avgCtr' in displayTotals ? displayTotals.avgCtr : 0).toFixed(2)}%`;
                break;
              case 'cpc':
                value = formatCurrency('avgCpc' in displayTotals ? displayTotals.avgCpc : 0);
                break;
              case 'results':
                value = formatNumber(displayTotals.results || 0);
                break;
              case 'cost_per_result':
                value = formatCurrency('avgCostPerResult' in displayTotals ? displayTotals.avgCostPerResult : 0);
                break;
              case 'messages':
                value = formatNumber(displayTotals.messages || 0);
                break;
              case 'cost_per_message':
                value = formatCurrency('avgCostPerMessage' in displayTotals ? displayTotals.avgCostPerMessage : 0);
                break;
            }

            return (
              <Card key={colId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {column.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? <Skeleton className="h-8 w-32" /> : value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
