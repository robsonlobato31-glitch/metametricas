import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, MousePointerClick, Users, Target, ShoppingCart, Eye, MessageSquare } from 'lucide-react';
import { useMetrics } from '@/hooks/useMetrics';
import { ExportReportButton } from '@/components/reports/ExportReportButton';
import { useExportReport } from '@/hooks/useExportReport';
import { SyncMetricsButton } from '@/components/SyncMetricsButton';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Metricas() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { totals, metaMetrics, googleMetrics, isLoading } = useMetrics(
    dateRange?.from,
    dateRange?.to
  );
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

  const handleExport = async () => {
    if (!totals) return;

    const periodText = dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
      : 'Últimos 30 dias';

    await exportReport({
      title: 'Relatório de Métricas',
      period: periodText,
      metrics: [
        { label: 'Total Gasto', value: formatCurrency(totals.spend) },
        { label: 'Impressões', value: formatNumber(totals.impressions) },
        { label: 'Cliques', value: formatNumber(totals.clicks) },
        { label: 'Conversões', value: formatNumber(totals.conversions) },
        { label: 'CTR Médio', value: `${totals.ctr.toFixed(2)}%` },
        { label: 'CPC Médio', value: formatCurrency(totals.cpc) },
      ],
      campaigns: [],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas</h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de performance das suas campanhas
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <SyncMetricsButton />
          <ExportReportButton 
            onClick={handleExport} 
            isLoading={isExporting}
            label="Exportar Métricas"
          />
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtro de Período</CardTitle>
          <CardDescription>
            Selecione o período para visualizar as métricas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            placeholder="Selecione o período"
            className="max-w-sm"
          />
        </CardContent>
      </Card>

        {/* Overview Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !totals ? (
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>
                Nenhuma métrica disponível. Clique em "Sincronizar Métricas" para carregar os dados das suas campanhas.
              </span>
              <SyncMetricsButton />
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.spend)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
                    : 'Últimos 30 dias'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impressões</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totals.impressions)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de visualizações</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cliques</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totals.clicks)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de cliques</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversões</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totals.conversions)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de conversões</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CTR Médio</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.ctr.toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Taxa de cliques</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPC Médio</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.cpc)}</div>
                <p className="text-xs text-muted-foreground mt-1">Custo por clique</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compras</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totals.purchases)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de compras</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visualizações de Página</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totals.page_views)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de page views</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resultados</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totals.results)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de ações do objetivo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo por Resultado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.cost_per_result)}</div>
                <p className="text-xs text-muted-foreground mt-1">Por ação do objetivo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totals.messages)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de conversas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo por Mensagem</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.cost_per_message)}</div>
                <p className="text-xs text-muted-foreground mt-1">Por mensagem iniciada</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Iniciou Checkout</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(totals.initiated_checkout)}</div>
                <p className="text-xs text-muted-foreground mt-1">Carrinhos iniciados</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Platform Comparison */}
        {!isLoading && totals && (
          <div className="grid gap-4 md:grid-cols-2">
            {metaMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Meta Ads</CardTitle>
                  <CardDescription>Performance do Facebook e Instagram</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Impressões</span>
                    <span className="font-medium">{formatNumber(metaMetrics.impressions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cliques</span>
                    <span className="font-medium">{formatNumber(metaMetrics.clicks)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gasto</span>
                    <span className="font-medium">{formatCurrency(metaMetrics.spend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Conversões</span>
                    <span className="font-medium">{formatNumber(metaMetrics.conversions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">CTR</span>
                    <span className="font-medium">{metaMetrics.ctr.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">CPC</span>
                    <span className="font-medium">{formatCurrency(metaMetrics.cpc)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Compras</span>
                    <span className="font-medium">{formatNumber(metaMetrics.purchases)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {googleMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Google Ads</CardTitle>
                  <CardDescription>Performance do Google Ads</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Impressões</span>
                    <span className="font-medium">{formatNumber(googleMetrics.impressions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cliques</span>
                    <span className="font-medium">{formatNumber(googleMetrics.clicks)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gasto</span>
                    <span className="font-medium">{formatCurrency(googleMetrics.spend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Conversões</span>
                    <span className="font-medium">{formatNumber(googleMetrics.conversions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">CTR</span>
                    <span className="font-medium">{googleMetrics.ctr.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">CPC</span>
                    <span className="font-medium">{formatCurrency(googleMetrics.cpc)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Compras</span>
                    <span className="font-medium">{formatNumber(googleMetrics.purchases)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
  );
}
