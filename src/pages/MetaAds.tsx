import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Facebook, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function MetaAds() {
  const { data: integrations, refetch: refetchIntegrations } = useIntegrations();
  const { data: adAccounts, refetch: refetchAccounts } = useAdAccounts('meta');
  const [accessToken, setAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const metaIntegration = integrations?.find(i => i.provider === 'meta');
  const isConnected = metaIntegration?.status === 'active';
  const isExpired = metaIntegration?.status === 'expired';

  const handleConnect = async () => {
    if (!accessToken.trim()) {
      toast.error('Digite um token de acesso válido');
      return;
    }

    setIsConnecting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Meta long-lived tokens expire after 60 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);

      // Criar/atualizar integração
      const { error } = await supabase.from('integrations').upsert({
        user_id: user.id,
        provider: 'meta',
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        integration_source: 'oauth_manual',
      }, {
        onConflict: 'user_id,provider',
      });

      if (error) throw error;

      toast.success('Meta Ads conectado com sucesso!');
      setAccessToken('');
      refetchIntegrations();
    } catch (error: any) {
      toast.error('Erro ao conectar', {
        description: error.message,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      // Chamar edge function de sincronização
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-meta-campaigns`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao sincronizar');
      }

      const result = await response.json();

      toast.success('Sincronização concluída!', {
        description: `${result.accountsSynced} contas e ${result.campaignsSynced} campanhas sincronizadas`,
      });

      refetchAccounts();
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido';
      
      // Check if it's a token expiration error
      if (errorMessage.includes('expired') || errorMessage.includes('Session has expired')) {
        toast.error('Token expirado', {
          description: 'Seu token de acesso expirou. Por favor, reconecte sua conta Meta Ads.',
        });
        refetchIntegrations();
      } else {
        toast.error('Erro ao sincronizar', {
          description: errorMessage,
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meta Ads</h1>
          <p className="text-muted-foreground mt-1">
            Conecte e sincronize suas campanhas do Facebook e Instagram
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-500" />
                <CardTitle>Status da Integração</CardTitle>
              </div>
              {isConnected ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Conectado
                </Badge>
              ) : isExpired ? (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Token Expirado
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
                ? 'Sua conta Meta Ads está conectada e funcionando'
                : isExpired
                ? 'Seu token de acesso expirou. Reconecte para continuar sincronizando'
                : 'Conecte sua conta para começar a importar dados'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Connect Card */}
        {(!isConnected || isExpired) && (
          <Card>
            <CardHeader>
              <CardTitle>{isExpired ? 'Reconectar' : 'Conectar'} Meta Ads</CardTitle>
              <CardDescription>
                {isExpired 
                  ? 'Seu token expirou. Gere um novo token no Meta Business Manager e conecte novamente'
                  : 'Cole o token de acesso gerado no Meta Business Manager'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="EAABwzLixnjY..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={isConnecting}
                />
                <p className="text-sm text-muted-foreground">
                  Obtenha seu token em:{' '}
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Meta Graph API Explorer
                  </a>
                </p>
              </div>

              <Button onClick={handleConnect} disabled={isConnecting || !accessToken.trim()}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  'Conectar Meta Ads'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sync and Accounts */}
        {isConnected && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Sincronizar Dados</CardTitle>
                <CardDescription>
                  Importe campanhas e métricas do Meta Ads
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
      </div>
  );
}
