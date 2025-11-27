import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { DashboardWidget, WidgetType } from '@/types/dashboard';
import { DollarSign, Users, MousePointerClick, TrendingUp, BarChart3, List, Bell, Zap } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface WidgetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWidget: (widget: DashboardWidget) => void;
  onRemoveWidget: (widgetId: string) => void;
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
  onRemoveWidget,
  existingWidgetIds,
}: WidgetSelectorProps) => {
  const categories = Array.from(new Set(AVAILABLE_WIDGETS.map(w => w.category)));

  const isWidgetActive = (widgetType: WidgetType) => {
    return existingWidgetIds.some(id => id.includes(widgetType));
  };

  const getWidgetId = (widgetType: WidgetType) => {
    return existingWidgetIds.find(id => id.includes(widgetType)) || '';
  };

  const handleToggleWidget = (widgetConfig: typeof AVAILABLE_WIDGETS[0], isActive: boolean) => {
    if (isActive) {
      // Adicionar widget
      const widget: DashboardWidget = {
        id: `${widgetConfig.type}-${Date.now()}`,
        type: widgetConfig.type,
        title: widgetConfig.title,
      };
      onSelectWidget(widget);
    } else {
      // Remover widget
      const widgetId = getWidgetId(widgetConfig.type);
      if (widgetId) {
        onRemoveWidget(widgetId);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Widgets</DialogTitle>
          <DialogDescription>
            Ative ou desative widgets no seu dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3">{category}</h3>
              <div className="space-y-2">
                {AVAILABLE_WIDGETS
                  .filter((w) => w.category === category)
                  .map((widget) => {
                    const isActive = isWidgetActive(widget.type);
                    return (
                      <Card key={widget.type}>
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
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`widget-${widget.type}`} className="text-xs text-muted-foreground">
                                {isActive ? 'Ativo' : 'Inativo'}
                              </Label>
                              <Switch
                                id={`widget-${widget.type}`}
                                checked={isActive}
                                onCheckedChange={(checked) => handleToggleWidget(widget, checked)}
                              />
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
