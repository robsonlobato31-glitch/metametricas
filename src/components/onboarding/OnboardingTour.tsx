import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useOnboarding } from '@/hooks/useOnboarding';

const steps: Step[] = [
  {
    target: '[data-tour="dashboard"]',
    content: 'Bem-vindo ao seu Dashboard! Aqui você pode visualizar todas as métricas importantes das suas campanhas em um só lugar.',
    disableBeacon: true,
    placement: 'center',
  },
  {
    target: '[data-tour="campaigns"]',
    content: 'Na seção de Campanhas, você pode ver e gerenciar todas as suas campanhas do Meta Ads e Google Ads.',
    placement: 'right',
  },
  {
    target: '[data-tour="integrations"]',
    content: 'Conecte suas contas do Meta Ads e Google Ads aqui para sincronizar automaticamente seus dados.',
    placement: 'right',
  },
  {
    target: '[data-tour="alerts"]',
    content: 'Configure alertas de orçamento para receber notificações quando suas campanhas atingirem limites específicos.',
    placement: 'right',
  },
  {
    target: '[data-tour="settings"]',
    content: 'Personalize suas preferências, templates de relatório e configurações de sincronização nas Configurações.',
    placement: 'right',
  },
];

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
}

export const OnboardingTour = ({ run, onComplete }: OnboardingTourProps) => {
  const { completeTour } = useOnboarding();
  const [stepIndex, setStepIndex] = useState(0);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeTour();
      onComplete();
      setStepIndex(0);
    } else if (action === 'next') {
      setStepIndex(index + 1);
    } else if (action === 'prev') {
      setStepIndex(index - 1);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: 'hsl(var(--background))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '8px',
          fontSize: '14px',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: '6px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: '8px',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
};
