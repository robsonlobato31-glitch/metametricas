import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DashboardWidget, WidgetType } from '@/types/dashboard';
import { DollarSign, Users, MousePointerClick, TrendingUp, BarChart3, List, Bell, Zap } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WidgetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWidget: (widget: DashboardWidget) => void;
  existingWidgetIds: string[];
}

const AVAILABLE_WIDGETS = [
  {
    type: 'metric-spend' as WidgetType,
    title: 'Total Gasto',
    description: 'Visualize o total gasto em campanhas',
    icon: DollarSign,
    category: 'Métricas',
  },
  {
    type: 'metric-impressions' as WidgetType,
    title: 'Impressões',
    description: 'Total de impressões das campanhas',
    icon: Users,
    category: 'Métricas',
  },
  {
    type: 'metric-clicks' as WidgetType,
    title: 'Cliques',
    description: 'Total de cliques nas campanhas',
    icon: MousePointerClick,
    category: 'Métricas',
  },
  {
    type: 'metric-conversions' as WidgetType,
    title: 'Conversões',
    description: 'Total de conversões geradas',
    icon: TrendingUp,
    category: 'Métricas',
  },
  {
    type: 'metric-results' as WidgetType,
    title: 'Resultados',
    description: 'Total de ações do objetivo',
    icon: TrendingUp,
    category: 'Métricas',
  },
  {
    type: 'metric-messages' as WidgetType,
    title: 'Mensagens',
    description: 'Total de conversas iniciadas',
    icon: TrendingUp,
    category: 'Métricas',
  },
  {
    type: 'metric-cost-per-result' as WidgetType,
    title: 'Custo por Resultado',
    description: 'Custo médio por resultado',
    icon: DollarSign,
    category: 'Métricas',
  },
  {
    type: 'chart-performance' as WidgetType,
    title: 'Gráfico de Performance',
    description: 'Visualize a performance ao longo do tempo',
    icon: BarChart3,
    category: 'Gráficos',
  },
  {
    type: 'campaign-list' as WidgetType,
    title: 'Lista de Campanhas',
    description: 'Veja suas campanhas mais recentes',
    icon: List,
    category: 'Listas',
  },
  {
    type: 'alerts-list' as WidgetType,
    title: 'Alertas',
    description: 'Monitore seus alertas ativos',
    icon: Bell,
    category: 'Listas',
  },
  {
    type: 'quick-actions' as WidgetType,
    title: 'Ações Rápidas',
    description: 'Acesso rápido às principais ações',
    icon: Zap,
    category: 'Ações',
  },
];

export const WidgetSelector = ({
  open,
  onOpenChange,
  onSelectWidget,
  existingWidgetIds,
}: WidgetSelectorProps) => {
  const availableWidgets = AVAILABLE_WIDGETS.filter(
    (widget) => !existingWidgetIds.includes(widget.type)
  );

  const categories = Array.from(new Set(availableWidgets.map(w => w.category)));

  const handleSelectWidget = (widgetConfig: typeof AVAILABLE_WIDGETS[0]) => {
    const widget: DashboardWidget = {
      id: `${widgetConfig.type}-${Date.now()}`,
      type: widgetConfig.type,
      title: widgetConfig.title,
    };
    onSelectWidget(widget);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Widget</DialogTitle>
          <DialogDescription>
            Selecione um widget para adicionar ao seu dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3">{category}</h3>
              <div className="grid grid-cols-2 gap-3">
                {availableWidgets
                  .filter((w) => w.category === category)
                  .map((widget) => (
                    <Card
                      key={widget.type}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectWidget(widget)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <widget.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm">{widget.title}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {widget.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
              </div>
            </div>
          ))}

          {availableWidgets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Todos os widgets disponíveis já estão no dashboard</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
