import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlayCircle, AlertCircle, CheckCircle, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const SyncTester = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runSync = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-scheduled-syncs', {
        body: { manual: true },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: 'Sincronização executada',
        description: `${data.processed || 0} agendamentos processados com sucesso.`,
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Erro na sincronização',
        description: error.message || 'Não foi possível executar a sincronização.',
        variant: 'destructive',
      });
      setResult({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          Testar Sincronização
        </CardTitle>
        <CardDescription>
          Execute a sincronização manualmente ou configure execução automática via cron
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button onClick={runSync} disabled={isRunning} className="w-full">
            {isRunning ? 'Executando...' : 'Executar Sincronização Agora'}
          </Button>
        </div>

        {result && (
          <Alert variant={result.error ? 'destructive' : 'default'}>
            {result.error ? (
              <>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erro:</strong> {result.error}
                </AlertDescription>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Sucesso:</strong> {result.processed} agendamento(s) processado(s)
                  {result.results && result.results.length > 0 && (
                    <pre className="mt-2 text-xs overflow-auto max-h-32 bg-muted p-2 rounded">
                      {JSON.stringify(result.results, null, 2)}
                    </pre>
                  )}
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        <Alert>
          <Code className="h-4 w-4" />
          <AlertDescription>
            <strong>Configurar Cron Job (Opcional):</strong>
            <p className="mt-2 text-xs">
              Para executar automaticamente, você pode configurar um cron job no Supabase SQL
              Editor:
            </p>
            <pre className="mt-2 text-xs overflow-auto max-h-40 bg-muted p-2 rounded">
              {`SELECT cron.schedule(
  'process-scheduled-syncs-hourly',
  '0 * * * *', -- A cada hora
  $$
  SELECT
    net.http_post(
      url:='https://jsrnqheidlbffwmiazqi.supabase.co/functions/v1/process-scheduled-syncs',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzcm5xaGVpZGxiZmZ3bWlhenFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDU3ODQsImV4cCI6MjA3OTYyMTc4NH0.94GpMwwc17gcRe0H0cL-sggLN4sVJfh9NK3ks8IDZTg"}'::jsonb,
      body:='{"scheduled": true}'::jsonb
    );
  $$
);`}
            </pre>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
