import { useState } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { DashboardWidget } from '@/types/dashboard';
import { MetricWidget } from './widgets/MetricWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { CampaignListWidget } from './widgets/CampaignListWidget';
import { AlertsWidget } from './widgets/AlertsWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { ResultsWidget } from './widgets/ResultsWidget';
import { MessagesWidget } from './widgets/MessagesWidget';
import { CostPerResultWidget } from './widgets/CostPerResultWidget';
import { useMetrics } from '@/hooks/useMetrics';
import { useChartData } from '@/hooks/useChartData';
import { DollarSign, Users, MousePointerClick, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  widgets: DashboardWidget[];
  layouts: {
    lg: Layout[];
    md: Layout[];
    sm: Layout[];
  };
  isEditMode: boolean;
  onLayoutChange: (layout: Layout[], layouts: any) => void;
  onRemoveWidget: (widgetId: string) => void;
}

export const DashboardGrid = ({
  widgets,
  layouts,
  isEditMode,
  onLayoutChange,
  onRemoveWidget,
}: DashboardGridProps) => {
  const { totals, isLoading } = useMetrics();
  const { data: chartData, isLoading: chartLoading } = useChartData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const renderWidget = (widget: DashboardWidget) => {
    const widgetContent = (() => {
      switch (widget.type) {
        case 'metric-spend':
          return (
            <MetricWidget
              title="Total Gasto"
              value={totals ? formatCurrency(totals.spend) : 'R$ 0,00'}
              description="Últimos 30 dias"
              icon={DollarSign}
              isLoading={isLoading}
            />
          );
        case 'metric-impressions':
          return (
            <MetricWidget
              title="Impressões"
              value={totals ? formatNumber(totals.impressions) : '0'}
              description="Total de visualizações"
              icon={Users}
              isLoading={isLoading}
            />
          );
        case 'metric-clicks':
          return (
            <MetricWidget
              title="Cliques"
              value={totals ? formatNumber(totals.clicks) : '0'}
              description="Total de cliques"
              icon={MousePointerClick}
              isLoading={isLoading}
            />
          );
        case 'metric-conversions':
          return (
            <MetricWidget
              title="Conversões"
              value={totals ? formatNumber(totals.conversions) : '0'}
              description="Total de conversões"
              icon={TrendingUp}
              isLoading={isLoading}
            />
          );
        case 'metric-results':
          return <ResultsWidget />;
        case 'metric-messages':
          return <MessagesWidget />;
        case 'metric-cost-per-result':
          return <CostPerResultWidget />;
        case 'chart-performance':
          return <ChartWidget title="Performance Semanal" data={chartData} isLoading={chartLoading} />;
        case 'campaign-list':
          return <CampaignListWidget />;
        case 'alerts-list':
          return <AlertsWidget />;
        case 'quick-actions':
          return <QuickActionsWidget />;
        default:
          return (
            <Card className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">Widget desconhecido</p>
            </Card>
          );
      }
    })();

    return (
      <div className="relative h-full">
        {widgetContent}
        {isEditMode && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveWidget(widget.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768 }}
      cols={{ lg: 12, md: 12, sm: 6 }}
      rowHeight={60}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      onLayoutChange={onLayoutChange}
      draggableHandle=".drag-handle"
      margin={[16, 16]}
    >
      {widgets.map((widget) => (
        <div key={widget.id} className={isEditMode ? 'cursor-move drag-handle' : ''}>
          {renderWidget(widget)}
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};
