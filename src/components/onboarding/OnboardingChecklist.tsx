import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useCampaignAlerts } from '@/hooks/useCampaignAlerts';
import { useReportTemplate } from '@/hooks/useReportTemplate';

interface OnboardingChecklistProps {
  onStartTour: () => void;
}

export const OnboardingChecklist = ({ onStartTour }: OnboardingChecklistProps) => {
  const { isTourCompleted } = useOnboarding();
  const { data: integrations } = useIntegrations();
  const { data: campaigns } = useCampaigns();
  const { alerts } = useCampaignAlerts();
  const { template } = useReportTemplate();

  const tasks = [
    {
      id: 'meta-integration',
      label: 'Conectar Meta Ads',
      completed: integrations?.some(i => i.provider === 'meta' && i.status === 'active') || false,
    },
    {
      id: 'google-integration',
      label: 'Conectar Google Ads',
      completed: integrations?.some(i => i.provider === 'google' && i.status === 'active') || false,
    },
    {
      id: 'first-sync',
      label: 'Primeira Sincronização',
      completed: (campaigns?.length || 0) > 0,
    },
    {
      id: 'alert-setup',
      label: 'Configurar Alertas',
      completed: (alerts?.length || 0) > 0,
    },
    {
      id: 'report-template',
      label: 'Personalizar Template de Relatório',
      completed: !!template,
    },
  ];

  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = (completedTasks / tasks.length) * 100;

  if (isTourCompleted && completedTasks === tasks.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Primeiros Passos</CardTitle>
            <CardDescription>
              Complete estes passos para aproveitar ao máximo a plataforma
            </CardDescription>
          </div>
          {!isTourCompleted && (
            <Button onClick={onStartTour} size="sm" variant="outline">
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar Tour
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{completedTasks}/{tasks.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <span className={task.completed ? 'text-foreground' : 'text-muted-foreground'}>
                {task.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
