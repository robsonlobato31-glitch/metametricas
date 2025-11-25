import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, DollarSign, MousePointerClick, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMetrics } from '@/hooks/useMetrics';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { totals, isLoading, refetch } = useMetrics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const stats = [
    {
      title: 'Total Gasto',
      value: totals ? formatCurrency(totals.spend) : 'R$ 0,00',
      icon: DollarSign,
      description: 'Últimos 30 dias',
    },
    {
      title: 'Impressões',
      value: totals ? formatNumber(totals.impressions) : '0',
      icon: Users,
      description: 'Total de visualizações',
    },
    {
      title: 'Cliques',
      value: totals ? formatNumber(totals.clicks) : '0',
      icon: MousePointerClick,
      description: 'Total de cliques',
    },
    {
      title: 'Conversões',
      value: totals ? formatNumber(totals.conversions) : '0',
      icon: TrendingUp,
      description: 'Total de conversões',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bem-vindo ao Dashboard! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/metricas')}>
              Ver Relatórios
            </Button>
            <Button onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
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
            </>
          ) : (
            stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        {!totals || totals.spend === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Primeiros Passos</CardTitle>
              <CardDescription>
                Configure suas integrações para começar a visualizar seus dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <Card className="flex-1 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">Meta Ads</CardTitle>
                    <CardDescription>
                      Conecte sua conta do Facebook/Instagram Ads
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/meta-ads')}
                    >
                      Conectar Meta Ads
                    </Button>
                  </CardContent>
                </Card>

                <Card className="flex-1 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">Google Ads</CardTitle>
                    <CardDescription>
                      Conecte sua conta do Google Ads
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/google-ads')}
                    >
                      Conectar Google Ads
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Performance Adicional</CardTitle>
              <CardDescription>Métricas detalhadas dos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CTR Médio</p>
                  <p className="text-2xl font-bold">{totals.ctr.toFixed(2)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">CPC Médio</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.cpc)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Compras</p>
                  <p className="text-2xl font-bold">{formatNumber(totals.purchases)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
