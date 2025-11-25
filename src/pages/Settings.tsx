import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { usePlan } from '@/hooks/usePlan';
import { User, Shield, CreditCard, LogOut } from 'lucide-react';
import { ReportTemplateSettings } from '@/components/settings/ReportTemplateSettings';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { isSuperAdmin, isAdmin, isUser } = useUserRole();
  const plan = usePlan();

  const getRoleBadge = () => {
    if (isSuperAdmin) return <Badge variant="destructive">Super Admin</Badge>;
    if (isAdmin) return <Badge variant="default">Admin</Badge>;
    return <Badge variant="secondary">Usuário</Badge>;
  };

  const getPlanBadge = () => {
    const planMap: Record<string, { variant: any; label: string }> = {
      survival: { variant: 'secondary', label: 'Survival' },
      professional: { variant: 'default', label: 'Professional' },
      agency: { variant: 'default', label: 'Agency' },
      enterprise: { variant: 'destructive', label: 'Enterprise' },
    };

    const config = planMap[plan.plan_type] || planMap.survival;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas informações de conta e preferências
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Perfil</CardTitle>
            </div>
            <CardDescription>Informações da sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">ID do Usuário</p>
              <p className="text-xs font-mono">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Role Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Permissões</CardTitle>
            </div>
            <CardDescription>Seu nível de acesso no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Tipo de Conta:</p>
              {getRoleBadge()}
            </div>
            {isSuperAdmin && (
              <p className="text-sm text-muted-foreground mt-2">
                Você tem acesso total ao sistema, incluindo gerenciamento de usuários e sem limites de contas.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Plano Atual</CardTitle>
            </div>
            <CardDescription>Informações do seu plano de assinatura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Plano:</p>
              {getPlanBadge()}
            </div>
            {!plan.isLoading && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uso de Contas</p>
                  <p className="text-base">
                    {plan.accounts_used} de {plan.max_accounts === Infinity ? '∞' : plan.max_accounts} contas
                  </p>
                </div>
                {plan.is_at_limit && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                    Você atingiu o limite de contas do seu plano. Faça upgrade para adicionar mais contas.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Report Template Settings */}
        <ReportTemplateSettings />

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>Opções de gerenciamento da conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
