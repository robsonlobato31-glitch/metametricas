import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, Target, Activity } from 'lucide-react';
import { useCampaignAnalytics } from '@/hooks/useCampaignAnalytics';

interface CampaignAnalyticsProps {
  dateFrom: Date;
  dateTo: Date;
  compareDateFrom?: Date;
  compareDateTo?: Date;
  provider?: 'meta' | 'google';
  accountId?: string;
}

export const CampaignAnalytics = ({
  dateFrom,
  dateTo,
  compareDateFrom,
  compareDateTo,
  provider,
  accountId,
}: CampaignAnalyticsProps) => {
  const { data: analytics, isLoading } = useCampaignAnalytics({
    dateFrom,
    dateTo,
    compareDateFrom,
    compareDateTo,
    provider,
    accountId,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const calculateChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando análise...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado disponível para análise.
      </div>
    );
  }

  const { dailyTrends, comparisonTrends, campaignROI, mainTotals, compareTotals } = analytics;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {compareTotals && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(mainTotals.spend)}</div>
              <p className="text-xs text-muted-foreground">
                {calculateChange(mainTotals.spend, compareTotals.spend).toFixed(1)}% vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressões</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(mainTotals.impressions)}</div>
              <p className="text-xs text-muted-foreground">
                {calculateChange(mainTotals.impressions, compareTotals.impressions).toFixed(1)}% vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cliques</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(mainTotals.clicks)}</div>
              <p className="text-xs text-muted-foreground">
                {calculateChange(mainTotals.clicks, compareTotals.clicks).toFixed(1)}% vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resultados</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(mainTotals.results)}</div>
              <p className="text-xs text-muted-foreground">
                {calculateChange(mainTotals.results, compareTotals.results).toFixed(1)}% vs período anterior
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="roi">ROI por Campanha</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Gastos</CardTitle>
              <CardDescription>Análise diária de investimento</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="spend" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Gasto"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Desempenho de Métricas</CardTitle>
              <CardDescription>Impressões, cliques e resultados ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="impressions" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    name="Impressões"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="Cliques"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="results" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    name="Resultados"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {comparisonTrends ? (
            <Card>
              <CardHeader>
                <CardTitle>Comparação de Períodos</CardTitle>
                <CardDescription>Análise comparativa de gastos entre períodos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={dailyTrends.map((day, index) => ({
                    date: day.date,
                    atual: day.spend,
                    anterior: comparisonTrends[index]?.spend || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="atual" fill="hsl(var(--primary))" name="Período Atual" />
                    <Bar dataKey="anterior" fill="hsl(var(--muted))" name="Período Anterior" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Selecione um período de comparação para visualizar a análise comparativa.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ROI por Campanha (Top 10)</CardTitle>
              <CardDescription>Retorno sobre investimento das campanhas mais rentáveis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={campaignROI} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="campaign_name" type="category" width={150} className="text-xs" />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'roi') return `${value.toFixed(2)}%`;
                      if (name === 'roas') return `R$ ${value.toFixed(2)}`;
                      return formatCurrency(value);
                    }}
                  />
                  <Legend />
                  <Bar dataKey="roi" fill="hsl(var(--chart-1))" name="ROI (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground bg-muted p-4 rounded-lg">
            <p className="font-semibold mb-1">Nota sobre cálculo de ROI:</p>
            <p>O ROI está sendo calculado com base em um valor médio de conversão estimado de R$ 100. Para resultados mais precisos, configure os valores reais de conversão por campanha.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
