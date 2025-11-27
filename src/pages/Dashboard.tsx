import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Edit3, Plus, RotateCcw, Save, Settings2 } from 'lucide-react';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { WidgetSelector } from '@/components/dashboard/WidgetSelector';
import { SyncMetricsButton } from '@/components/SyncMetricsButton';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { Layout as GridLayout } from 'react-grid-layout';
import { DashboardWidget } from '@/types/dashboard';
import { ColumnCustomizer } from '@/components/filters/ColumnCustomizer';

const AVAILABLE_WIDGETS = [
  { id: 'metric-spend', label: 'Gasto Total', required: false },
  { id: 'metric-impressions', label: 'Impressões', required: false },
  { id: 'metric-clicks', label: 'Cliques', required: false },
  { id: 'metric-conversions', label: 'Conversões', required: false },
  { id: 'metric-results', label: 'Resultados', required: false },
  { id: 'metric-messages', label: 'Mensagens', required: false },
  { id: 'chart-performance', label: 'Gráfico de Performance', required: false },
  { id: 'alerts', label: 'Alertas', required: false },
  { id: 'campaigns', label: 'Lista de Campanhas', required: false },
  { id: 'quick-actions', label: 'Ações Rápidas', required: false },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { isTourCompleted } = useOnboarding();
  const { layout, saveLayout, resetLayout, addWidget, removeWidget, isSaving } = useDashboardLayout();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [currentLayouts, setCurrentLayouts] = useState(layout.layouts);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(
    layout.widgets.map((w) => w.type)
  );

  const handleStartTour = () => {
    setRunTour(true);
  };

  const handleTourComplete = () => {
    setRunTour(false);
  };

  const handleLayoutChange = (currentLayout: GridLayout[], allLayouts: any) => {
    setCurrentLayouts(allLayouts);
  };

  const handleSaveLayout = () => {
    saveLayout({
      layouts: currentLayouts,
      widgets: layout.widgets,
    });
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setCurrentLayouts(layout.layouts);
    setIsEditMode(false);
  };

  const handleResetLayout = () => {
    if (confirm('Tem certeza que deseja resetar o layout para o padrão?')) {
      resetLayout();
      setIsEditMode(false);
    }
  };

  const handleAddWidget = (widget: DashboardWidget) => {
    addWidget(widget);
  };

  const handleRemoveWidgetFromGrid = (widgetId: string) => {
    if (confirm('Tem certeza que deseja remover este widget?')) {
      removeWidget(widgetId);
    }
  };

  const handleRemoveWidgetFromSelector = (widgetId: string) => {
    removeWidget(widgetId);
  };

  return (
    <div className="space-y-6" data-tour="dashboard">
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
          
          <div className="flex gap-2 flex-wrap">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveLayout} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Layout
                </Button>
              </>
            ) : (
              <>
                <SyncMetricsButton />
                <ColumnCustomizer
                  pageName="dashboard"
                  availableColumns={AVAILABLE_WIDGETS}
                  onColumnsChange={setVisibleWidgets}
                />
                <Button 
                  variant="outline" 
                  onClick={handleResetLayout}
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowWidgetSelector(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Widget
                </Button>
                <Button
                  onClick={() => setIsEditMode(true)}
                  size="sm"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar Layout
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Onboarding Checklist */}
        {!isTourCompleted && (
          <OnboardingChecklist onStartTour={handleStartTour} />
        )}

        {/* Dashboard Grid */}
        <DashboardGrid
          widgets={layout.widgets}
          layouts={currentLayouts}
          isEditMode={isEditMode}
          onLayoutChange={handleLayoutChange}
          onRemoveWidget={handleRemoveWidgetFromGrid}
        />

        {/* Onboarding Tour */}
        <OnboardingTour run={runTour} onComplete={handleTourComplete} />

        {/* Widget Selector */}
        <WidgetSelector
          open={showWidgetSelector}
          onOpenChange={setShowWidgetSelector}
          onSelectWidget={handleAddWidget}
          onRemoveWidget={handleRemoveWidgetFromSelector}
          existingWidgetIds={layout.widgets.map(w => w.id)}
        />
      </div>
  );
}
