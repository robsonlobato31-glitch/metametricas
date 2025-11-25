import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, MousePointerClick, Users, Target } from 'lucide-react';

export default function Metricas() {
  // Mock data - will be replaced with real data from useMetrics hook
  const metrics = {
    meta: {
      impressions: 125000,
      clicks: 3200,
      spend: 850.50,
      conversions: 45,
      ctr: 2.56,
      cpc: 0.27,
    },
    google: {
      impressions: 98000,
      clicks: 2800,
      spend: 720.30,
      conversions: 38,
      ctr: 2.86,
      cpc: 0.26,
    },
  };

  const totalMetrics = {
    impressions: metrics.meta.impressions + metrics.google.impressions,
    clicks: metrics.meta.clicks + metrics.google.clicks,
    spend: metrics.meta.spend + metrics.google.spend,
    conversions: metrics.meta.conversions + metrics.google.conversions,
    ctr: ((metrics.meta.ctr + metrics.google.ctr) / 2).toFixed(2),
    cpc: ((metrics.meta.cpc + metrics.google.cpc) / 2).toFixed(2),
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas</h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de performance das suas campanhas
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMetrics.spend)}</div>
              <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
              <div className="flex items-center text-xs text-green-500 mt-2">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.5% vs mês anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressões</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalMetrics.impressions)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total de visualizações</p>
              <div className="flex items-center text-xs text-green-500 mt-2">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8.3% vs mês anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cliques</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalMetrics.clicks)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total de cliques</p>
              <div className="flex items-center text-xs text-green-500 mt-2">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15.7% vs mês anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversões</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.conversions}</div>
              <p className="text-xs text-muted-foreground mt-1">Total de conversões</p>
              <div className="flex items-center text-xs text-red-500 mt-2">
                <TrendingDown className="h-3 w-3 mr-1" />
                -2.1% vs mês anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CTR Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.ctr}%</div>
              <p className="text-xs text-muted-foreground mt-1">Taxa de cliques</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPC Médio</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalMetrics.cpc}</div>
              <p className="text-xs text-muted-foreground mt-1">Custo por clique</p>
            </CardContent>
          </Card>
        </div>

        {/* Platform Comparison */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Meta Ads</CardTitle>
              <CardDescription>Performance do Facebook e Instagram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Impressões</span>
                <span className="font-medium">{formatNumber(metrics.meta.impressions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cliques</span>
                <span className="font-medium">{formatNumber(metrics.meta.clicks)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gasto</span>
                <span className="font-medium">{formatCurrency(metrics.meta.spend)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Conversões</span>
                <span className="font-medium">{metrics.meta.conversions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">CTR</span>
                <span className="font-medium">{metrics.meta.ctr}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">CPC</span>
                <span className="font-medium">R$ {metrics.meta.cpc}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Google Ads</CardTitle>
              <CardDescription>Performance do Google Ads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Impressões</span>
                <span className="font-medium">{formatNumber(metrics.google.impressions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cliques</span>
                <span className="font-medium">{formatNumber(metrics.google.clicks)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gasto</span>
                <span className="font-medium">{formatCurrency(metrics.google.spend)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Conversões</span>
                <span className="font-medium">{metrics.google.conversions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">CTR</span>
                <span className="font-medium">{metrics.google.ctr}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">CPC</span>
                <span className="font-medium">R$ {metrics.google.cpc}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
