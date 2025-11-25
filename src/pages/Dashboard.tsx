import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, DollarSign, MousePointerClick } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  // Mock data - will be replaced with real data later
  const stats = [
    {
      title: 'Total Gasto',
      value: 'R$ 0,00',
      icon: DollarSign,
      description: 'Últimos 30 dias',
      trend: '+0%',
    },
    {
      title: 'Impressões',
      value: '0',
      icon: Users,
      description: 'Total de visualizações',
      trend: '+0%',
    },
    {
      title: 'Cliques',
      value: '0',
      icon: MousePointerClick,
      description: 'Total de cliques',
      trend: '+0%',
    },
    {
      title: 'Conversões',
      value: '0',
      icon: TrendingUp,
      description: 'Total de conversões',
      trend: '+0%',
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
            <Button variant="outline">Ver Relatórios</Button>
            <Button>Sincronizar Dados</Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
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
                <p className="text-xs text-green-500 mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
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
                  <Button variant="outline" className="w-full">
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
                  <Button variant="outline" className="w-full">
                    Conectar Google Ads
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
