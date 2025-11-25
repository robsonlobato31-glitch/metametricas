import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCampaignAlerts } from '@/hooks/useCampaignAlerts';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export const AlertsWidget = () => {
  const { alerts, isLoading } = useCampaignAlerts();
  const navigate = useNavigate();

  const recentAlerts = alerts?.slice(0, 5) || [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Alertas Recentes</CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/alerta-gasto')}
        >
          Ver Todos
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : recentAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
            <p>Nenhum alerta ativo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAlerts.map((alert: any) => (
              <div
                key={alert.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate('/alerta-gasto')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {alert.campaigns?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.percentage.toFixed(0)}% do limite atingido
                    </p>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    {alert.alert_type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
