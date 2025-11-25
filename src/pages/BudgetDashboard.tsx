import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { useCampaignBudgetHistory } from '@/hooks/useCampaignBudgetHistory';
import { Badge } from '@/components/ui/badge';
import { ExportReportButton } from '@/components/reports/ExportReportButton';
import { useExportReport } from '@/hooks/useExportReport';
import { DateRangePicker } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { subDays, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ColumnCustomizer } from '@/components/filters/ColumnCustomizer';
import { AdAccountFilter } from '@/components/filters/AdAccountFilter';

const AVAILABLE_COLUMNS = [
  { id: 'campaign_name', label: 'Campanha', required: true },
  { id: 'budget', label: 'Orçamento', required: true },
  { id: 'spend', label: 'Gasto', required: true },
  { id: 'percentage', label: 'Utilização %', required: false },
  { id: 'status', label: 'Status', required: false },
];

const BudgetDashboard = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map((col) => col.id)
  );

  // Calculate days based on custom range or preset
  const calculatedDays = useCustomRange && dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from) + 1
    : parseInt(timeRange);

  const { aggregatedData, campaignCumulativeData, isLoading } = useCampaignBudgetHistory(
    calculatedDays,
    useCustomRange && dateRange?.from ? dateRange.from : undefined,
    useCustomRange && dateRange?.to ? dateRange.to : undefined
  );
  const { exportReport, isExporting } = useExportReport();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleExport = async () => {
    const totalBudget = aggregatedData.reduce((sum, day) => sum + day.budget, 0);
    const totalSpend = aggregatedData.reduce((sum, day) => sum + day.spend, 0);

    const periodText = useCustomRange && dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
      : `Últimos ${timeRange} dias`;

    await exportReport({
      title: 'Relatório de Orçamento de Campanhas',
      period: periodText,
      metrics: [
        { label: 'Gasto Total', value: formatCurrency(totalSpend) },
        { label: 'Orçamento Total', value: formatCurrency(totalBudget) },
        { label: 'Campanhas', value: `${campaignCumulativeData.length}` },
        { label: 'Utilização', value: `${((totalSpend / totalBudget) * 100).toFixed(1)}%` },
      ],
      campaigns: campaignCumulativeData.map((c) => ({
        name: c.name,
        provider: 'Meta/Google',
        status: c.percentage >= 100 ? 'Excedido' : c.percentage >= 90 ? 'Crítico' : 'Normal',
        spend: formatCurrency(c.currentSpend),
        budget: formatCurrency(c.budget),
      })),
      chartIds: {
        budgetChart: 'budget-chart',
        trendChart: 'trend-chart',
      },
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getBudgetStatus = (percentage: number) => {
    if (percentage >= 100) return { variant: 'destructive' as const, label: 'Excedido' };
    if (percentage >= 90) return { variant: 'destructive' as const, label: 'Crítico' };
    if (percentage >= 80) return { variant: 'default' as const, label: 'Atenção' };
    return { variant: 'secondary' as const, label: 'Normal' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Orçamento</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe a evolução de gastos vs orçamento das suas campanhas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ColumnCustomizer
            pageName="budget_dashboard"
            availableColumns={AVAILABLE_COLUMNS}
            onColumnsChange={setVisibleColumns}
          />
          <ExportReportButton 
            onClick={handleExport} 
            isLoading={isExporting}
          />
          <Select
            value={useCustomRange ? 'custom' : timeRange} 
            onValueChange={(value) => {
              if (value === 'custom') {
                setUseCustomRange(true);
              } else {
                setUseCustomRange(false);
                setTimeRange(value);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Período personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Date Range Filter */}
      {useCustomRange && (
        <Card>
          <CardHeader>
            <CardTitle>Período Personalizado</CardTitle>
            <CardDescription>
              Selecione o intervalo de datas e conta para análise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              placeholder="Selecione o período"
              className="max-w-sm"
            />
            <AdAccountFilter
              value={accountId}
              onChange={setAccountId}
            />
          </CardContent>
        </Card>
      )}

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : aggregatedData.length === 0 ? (
          <Alert>
            <AlertDescription>
              Nenhum dado disponível para o período selecionado. Configure suas campanhas e sincronize os dados para visualizar os gráficos.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Aggregated Daily Spend vs Budget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Gasto Diário vs Orçamento Total
                </CardTitle>
                <CardDescription>
                  Comparação do gasto diário com o orçamento total de todas as campanhas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={aggregatedData} id="budget-chart">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="displayDate" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `R$ ${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="spend" 
                      fill="hsl(var(--primary))" 
                      name="Gasto"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="budget" 
                      fill="hsl(var(--muted))" 
                      name="Orçamento"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Campaign Status Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaignCumulativeData.map((campaign) => {
                const status = getBudgetStatus(campaign.percentage);
                return (
                  <Card key={campaign.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-medium line-clamp-1">
                          {campaign.name}
                        </CardTitle>
                        <Badge variant={status.variant} className="ml-2 shrink-0">
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Gasto Atual</span>
                          <span className="font-medium">
                            {formatCurrency(campaign.currentSpend)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Orçamento</span>
                          <span className="font-medium">{formatCurrency(campaign.budget)}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              campaign.percentage >= 100
                                ? 'bg-destructive'
                                : campaign.percentage >= 90
                                ? 'bg-destructive'
                                : campaign.percentage >= 80
                                ? 'bg-yellow-500'
                                : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(campaign.percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-right">
                          {campaign.percentage.toFixed(1)}% utilizado
                        </p>
                      </div>

                      {campaign.percentage >= 90 && (
                        <div className="flex items-center gap-2 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Orçamento {campaign.percentage >= 100 ? 'excedido' : 'crítico'}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Cumulative Spend Chart */}
            {campaignCumulativeData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Evolução de Gasto Acumulado por Campanha
                  </CardTitle>
                  <CardDescription>
                    Acompanhe como o gasto acumulado evolui ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart id="trend-chart">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="displayDate" 
                        type="category"
                        allowDuplicatedCategory={false}
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {campaignCumulativeData.slice(0, 5).map((campaign, index) => {
                        const colors = [
                          'hsl(var(--primary))',
                          'hsl(var(--chart-2))',
                          'hsl(var(--chart-3))',
                          'hsl(var(--chart-4))',
                          'hsl(var(--chart-5))',
                        ];
                        return (
                          <Line
                            key={campaign.id}
                            data={campaign.data}
                            type="monotone"
                            dataKey="spend"
                            stroke={colors[index % colors.length]}
                            strokeWidth={2}
                            name={campaign.name}
                            dot={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                  {campaignCumulativeData.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      Exibindo as 5 primeiras campanhas. Total: {campaignCumulativeData.length} campanhas
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
  );
};

export default BudgetDashboard;
