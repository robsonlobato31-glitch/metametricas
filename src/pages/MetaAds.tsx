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
import { Facebook, Loader2, CheckCircle, XCircle, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MetaAds() {
  const { data: integrations, refetch: refetchIntegrations } = useIntegrations();
  const { data: adAccounts, refetch: refetchAccounts } = useAdAccounts('meta');
  const [accessToken, setAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showEditToken, setShowEditToken] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

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

      if (metaIntegration) {
        // UPDATE existing integration
        const { error } = await supabase
          .from('integrations')
          .update({
            access_token: accessToken,
            expires_at: expiresAt.toISOString(),
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', metaIntegration.id);

        if (error) throw error;
        toast.success('Token atualizado com sucesso!');
      } else {
        // INSERT new integration
        const { error } = await supabase
          .from('integrations')
          .insert({
            user_id: user.id,
            provider: 'meta',
            access_token: accessToken,
            expires_at: expiresAt.toISOString(),
            status: 'active',
            integration_source: 'oauth_manual',
          });

        if (error) throw error;
        toast.success('Meta Ads conectado com sucesso!');
      }

      setAccessToken('');
      setShowEditToken(false);
      refetchIntegrations();
    } catch (error: any) {
      toast.error('Erro ao conectar', {
        description: error.message,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRemoveIntegration = async () => {
    if (!metaIntegration) return;

    setIsRemoving(true);
    try {
      // First remove related ad_accounts
      const { error: accountsError } = await supabase
        .from('ad_accounts')
        .delete()
        .eq('integration_id', metaIntegration.id);

      if (accountsError) throw accountsError;

      // Then remove the integration
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', metaIntegration.id);

      if (error) throw error;

      toast.success('Integração removida com sucesso!');
      setShowRemoveDialog(false);
      setShowEditToken(false);
      refetchIntegrations();
      refetchAccounts();
    } catch (error: any) {
      toast.error('Erro ao remover', { description: error.message });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      // Chamar edge function de sincronização
      const response = await fetch(
        `https://jsrnqheidlbffwmiazqi.supabase.co/functions/v1/sync-meta-campaigns`,
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
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meta Ads</h1>
        <p className="text-muted-foreground mt-1">
          Conecte e sincronize suas campanhas do Facebook e Instagram
        </p>
      </div>

      {/* Status Card + Sync Card side by side when connected */}
      {isConnected && !showEditToken ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">Status da Integração</CardTitle>
                </div>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Conectado
                </Badge>
              </div>
              <CardDescription className="text-sm">
                Sua conta Meta Ads está conectada e funcionando
              </CardDescription>
              {metaIntegration?.expires_at && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Expira em: {format(new Date(metaIntegration.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditToken(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRemoveDialog(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sincronizar Dados</CardTitle>
              <CardDescription className="text-sm">
                Importe campanhas e métricas do Meta Ads
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button onClick={handleSync} disabled={isSyncing} size="sm">
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
        </div>
      ) : (
        /* Status Card when not connected */
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Status da Integração</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isExpired ? (
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

                {/* Action buttons when integration exists */}
                {metaIntegration && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditToken(true)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRemoveDialog(true)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  </>
                )}
              </div>
            </div>
            <CardDescription className="text-sm">
              {isExpired
                ? 'Seu token de acesso expirou. Clique em "Editar" para atualizar o token'
                : 'Conecte sua conta para começar a importar dados'}
            </CardDescription>
            {metaIntegration?.expires_at && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {isExpired ? 'Expirou em: ' : 'Expira em: '}
                  {format(new Date(metaIntegration.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Connect/Edit Token Card */}
      {(!metaIntegration || isExpired || showEditToken) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {isExpired ? 'Reconectar' : showEditToken ? 'Editar Token' : 'Conectar'} Meta Ads
            </CardTitle>
            <CardDescription className="text-sm">
              {isExpired
                ? 'Seu token expirou. Gere um novo token no Meta Business Manager e conecte novamente'
                : showEditToken
                ? 'Atualize seu token de acesso do Meta Ads'
                : 'Cole o token de acesso gerado no Meta Business Manager'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
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

            <div className="flex gap-2">
              <Button onClick={handleConnect} disabled={isConnecting || !accessToken.trim()}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : metaIntegration ? (
                  'Atualizar Token'
                ) : (
                  'Conectar Meta Ads'
                )}
              </Button>
              {showEditToken && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditToken(false);
                    setAccessToken('');
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ad Accounts - Grid layout with 4 columns */}
      {isConnected && !showEditToken && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Contas Conectadas</CardTitle>
            <CardDescription className="text-sm">
              {adAccounts?.length || 0} conta(s) de anúncios
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {adAccounts && adAccounts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {adAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-2 border rounded-lg"
                  >
                    <p className="font-medium text-sm truncate">{account.account_name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        ID: {account.account_id}
                      </p>
                      <Badge variant="outline" className="text-xs ml-1 shrink-0">
                        {account.currency}
                      </Badge>
                    </div>
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
      )}

      {/* Remove Integration Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Integração</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a integração com Meta Ads?
              Isso irá remover todas as contas de anúncios sincronizadas.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveIntegration}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
