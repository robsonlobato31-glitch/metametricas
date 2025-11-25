import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Chrome, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function GoogleAds() {
  const { data: integrations, refetch: refetchIntegrations } = useIntegrations();
  const { data: adAccounts, refetch: refetchAccounts } = useAdAccounts('google');
  const [isSyncing, setIsSyncing] = useState(false);

  const googleIntegration = integrations?.find(i => i.provider === 'google');
  const isConnected = googleIntegration?.status === 'active';
  const isSocialLogin = googleIntegration?.integration_source === 'social_login';

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-ads-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Erro ao sincronizar');
      }

      toast.success('Sincronização concluída!', {
        description: `${result.accountsSynced} contas sincronizadas`,
      });

      refetchAccounts();
    } catch (error: any) {
      toast.error('Erro ao sincronizar', {
        description: error.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Google Ads</h1>
          <p className="text-muted-foreground mt-1">
            Conecte e sincronize suas campanhas do Google Ads
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Chrome className="h-5 w-5 text-red-500" />
                <CardTitle>Status da Integração</CardTitle>
              </div>
              {isConnected ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Desconectado
                </Badge>
              )}
            </div>
            <CardDescription>
              {isConnected
                ? isSocialLogin
                  ? 'Conectado via Google OAuth (login social)'
                  : 'Conectado via OAuth manual'
                : 'Faça login com Google para conectar automaticamente'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Developer Token Warning */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> A sincronização de dados do Google Ads requer um{' '}
            <strong>Developer Token</strong>. Se você ainda não configurou, a sincronização pode falhar.
            <br />
            <a
              href="https://ads.google.com/aw/apicenter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline mt-1 inline-block"
            >
              Obter Developer Token →
            </a>
          </AlertDescription>
        </Alert>

        {/* Sync Card */}
        {isConnected && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Sincronizar Dados</CardTitle>
                <CardDescription>
                  Importe contas e campanhas do Google Ads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    'Sincronizar Agora'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Ad Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>Contas Conectadas</CardTitle>
                <CardDescription>
                  {adAccounts?.length || 0} conta(s) de anúncios
                </CardDescription>
              </CardHeader>
              <CardContent>
                {adAccounts && adAccounts.length > 0 ? (
                  <div className="space-y-2">
                    {adAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{account.account_name}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {account.account_id}
                          </p>
                        </div>
                        <Badge variant="outline">{account.currency}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conta conectada. Clique em "Sincronizar Agora" para importar suas contas.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Not Connected */}
        {!isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Como Conectar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Opção 1 (Recomendada):</strong> Faça logout e entre novamente usando{' '}
                  <strong>"Continuar com Google"</strong>. A integração será criada automaticamente.
                </p>
                <p className="text-sm">
                  <strong>Opção 2:</strong> Configure OAuth manual (requer configuração adicional).
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
