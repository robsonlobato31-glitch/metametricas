import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Loader2 } from 'lucide-react';

export const BudgetMonitorButton = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);

  const handleMonitorBudgets = async () => {
    setIsMonitoring(true);
    
    try {
      console.log('🔍 Calling budget monitoring function...');
      
      const { data, error } = await supabase.functions.invoke('monitor-campaign-budgets', {
        body: {},
      });

      if (error) {
        console.error('Error calling budget monitor:', error);
        throw error;
      }

      console.log('✅ Budget monitoring response:', data);

      if (data.success) {
        toast.success('Monitoramento Concluído', {
          description: `${data.campaigns_checked} campanhas verificadas. ${data.alerts_created} novos alertas criados.`,
        });
      } else {
        throw new Error(data.error || 'Erro ao monitorar orçamentos');
      }
    } catch (error: any) {
      console.error('Error monitoring budgets:', error);
      toast.error('Erro ao monitorar orçamentos', {
        description: error.message || 'Tente novamente mais tarde',
      });
    } finally {
      setIsMonitoring(false);
    }
  };

  return (
    <Button
      onClick={handleMonitorBudgets}
      disabled={isMonitoring}
      variant="outline"
      size="sm"
    >
      {isMonitoring ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Monitorando...
        </>
      ) : (
        <>
          <Shield className="h-4 w-4 mr-2" />
          Monitorar Orçamentos
        </>
      )}
    </Button>
  );
};
