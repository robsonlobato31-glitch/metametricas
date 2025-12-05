import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Chrome, RefreshCw, CheckCircle2, AlertTriangle, Link as LinkIcon, ExternalLink, Trash2 } from 'lucide-react';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function GoogleAds() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: integrations, refetch: refetchIntegrations } = useIntegrations();
  const { data: accounts, refetch: refetchAccounts } = useAdAccounts();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const googleIntegration = integrations?.find(i => i.provider === 'google');
  const isConnected = googleIntegration?.status === 'active';

  useEffect(() => {
    const checkSessionAndSaveIntegration = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.provider_token) {
        // Se temos um token de provider na sessão, tentamos salvar a integração manualmente
        // Isso garante que a integração seja criada mesmo se o trigger falhar
        try {
          const { error } = await supabase
            .from('integrations')
            .upsert({
              user_id: session.user.id,
              provider: 'google',
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token,
              status: 'active',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,provider'
            });

          if (!error) {
            refetchIntegrations();
          }
        } catch (err) {
          console.error("Erro ao salvar integração manualmente:", err);
        }
      }
    };

    checkSessionAndSaveIntegration();

    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro na conexão",
        description: errorDescription || "Falha ao conectar com Google Ads",
      });
    }
  }, [searchParams, toast, refetchIntegrations]);

  const handleConnect = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'email profile https://www.googleapis.com/auth/adwords',
          redirectTo: `${window.location.origin}/google-ads`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const handleDisconnect = async () => {
    if (!googleIntegration) return;

    setIsDisconnecting(true);
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', googleIntegration.id);

      if (error) throw error;

      toast({
        title: "Desconectado",
        description: "A integração com Google Ads foi removida.",
      });

      refetchIntegrations();
      refetchAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao desconectar",
        description: error.message,
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncProgress(10);
    setSyncStatus('Iniciando sincronização...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      // 1. Sincronizar Contas e Campanhas
      setSyncStatus('Sincronizando contas e campanhas...');
      setSyncProgress(30);

      const responseData = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-ads-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!responseData.ok) {
        const errorData = await responseData.json();
        throw new Error(errorData.error || errorData.message || 'Falha na sincronização de dados');
      }

      setSyncProgress(60);
      setSyncStatus('Sincronizando métricas...');

      // 2. Sincronizar Métricas
      const responseMetrics = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-ads-metrics`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!responseMetrics.ok) {
        const errorData = await responseMetrics.json();
        throw new Error(errorData.error || errorData.message || 'Falha na sincronização de métricas');
      }

      setSyncProgress(100);
      setSyncStatus('Sincronização concluída!');

      toast({
        title: "Sincronização concluída",
        description: "Seus dados do Google Ads foram atualizados com sucesso.",
      });

      refetchAccounts();
    } catch (error: any) {
      console.error('Erro na sincronização:', error);
      toast({
        variant: "destructive",
        title: "Erro na sincronização",
        description: error.message || "Ocorreu um erro ao sincronizar os dados.",
      });
      setSyncStatus('Erro na sincronização');
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
        setSyncStatus('');
      }, 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integração Google Ads</h1>
        <p className="text-muted-foreground">
          Gerencie sua conexão com o Google Ads e sincronize suas campanhas.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Chrome className="h-6 w-6 text-blue-500" />
              Status da Conexão
            </CardTitle>
            <CardDescription>
              Gerencie a conexão da sua conta Google Ads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected ? (
              <div className="space-y-4">
                <Alert className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Conectado</AlertTitle>
                  <AlertDescription>
                    Sua conta Google Ads está conectada e ativa.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Última sincronização: {googleIntegration?.updated_at ? new Date(googleIntegration.updated_at).toLocaleString() : 'Nunca'}
                  </div>

                  {isSyncing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>{syncStatus}</span>
                        <span>{syncProgress}%</span>
                      </div>
                      <Progress value={syncProgress} className="h-2" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="flex-1"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" disabled={isDisconnecting}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desconectar Google Ads?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá a conexão com sua conta do Google Ads. As campanhas e métricas importadas permanecerão no sistema, mas não serão mais atualizadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Não conectado</AlertTitle>
                  <AlertDescription>
                    Conecte sua conta Google Ads para importar campanhas e métricas.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleConnect} className="w-full">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Conectar Google Ads
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuração Necessária</CardTitle>
            <CardDescription>
              Requisitos para funcionamento da integração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Developer Token</h4>
              <p className="text-sm text-muted-foreground">
                Para acesso à API do Google Ads, é necessário configurar um Developer Token nas variáveis de ambiente do Supabase Edge Functions.
              </p>
              <Alert variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Certifique-se de que a variável <code>GOOGLE_ADS_DEVELOPER_TOKEN</code> está configurada no seu projeto Supabase.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      {isConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Contas Conectadas</CardTitle>
                <CardDescription>
                  Contas de anúncio importadas do Google Ads
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/google-ads/campanhas" className="flex items-center gap-2">
                  Ver Campanhas <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accounts && accounts.length > 0 ? (
              <div className="space-y-4">
                {accounts.filter(a => a.provider === 'google').map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{account.account_name}</p>
                      <p className="text-sm text-muted-foreground">ID: {account.account_id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{account.currency}</Badge>
                      <Badge className={account.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                        {account.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma conta encontrada. Execute a sincronização para importar suas contas.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
