import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Crown, Pencil } from 'lucide-react';
import { usePlan } from '@/hooks/usePlan';
import { useUserRole } from '@/hooks/useUserRole';
import { usePlanConfigs } from '@/hooks/usePlanConfigs';
import { EditPlanDialog } from '@/components/plans/EditPlanDialog';

export default function Plans() {
  const { plan_type, accounts_used, max_accounts, trial_ends_at, isLoading } = usePlan();
  const { isSuperAdmin } = useUserRole();
  const { planConfigs, updatePlanConfig } = usePlanConfigs();
  const [editingPlan, setEditingPlan] = useState<typeof planConfigs[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isTrialActive = trial_ends_at && new Date(trial_ends_at) > new Date();

  const handleEditPlan = (plan: typeof planConfigs[0]) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Plano</h1>
        <p className="text-muted-foreground mt-2">Escolha o melhor plano para seu negócio</p>
      </div>

      {/* Plano Atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Plano Atual</CardTitle>
            {isTrialActive && (
              <Badge variant="secondary">
                Trial até {new Date(trial_ends_at).toLocaleDateString('pt-BR')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold capitalize">{plan_type || 'Survival'}</p>
              {!isSuperAdmin && (
                <p className="text-sm text-muted-foreground mt-1">
                  {accounts_used || 0} de {max_accounts || 2} contas utilizadas
                </p>
              )}
              {isSuperAdmin && (
                <Badge variant="default" className="mt-2">Super Admin - Sem Limites</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Planos - Super Admin */}
      {isSuperAdmin && planConfigs && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle>Configuração de Planos</CardTitle>
            </div>
            <CardDescription>
              Edite as informações exibidas nos popups de upgrade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={planConfigs[0]?.plan_type} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {planConfigs.map((plan) => (
                  <TabsTrigger key={plan.plan_type} value={plan.plan_type}>
                    {plan.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {planConfigs.map((plan) => (
                <TabsContent key={plan.plan_type} value={plan.plan_type} className="space-y-4 mt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                      <p className="text-3xl font-bold mt-2">
                        {plan.price_display}
                        <span className="text-base text-muted-foreground font-normal"> /mês</span>
                      </p>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPlan(plan)}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                  </div>

                  <div className="space-y-3 mt-4">
                    <p className="font-medium text-sm">Recursos inclusos:</p>
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.hotmart_url && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-1">URL Kiwify:</p>
                      <a
                        href={plan.hotmart_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {plan.hotmart_url}
                      </a>
                    </div>
                  )}

                  <div className="pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Planos Disponíveis */}
      {!isSuperAdmin && planConfigs && (
        <div className="grid gap-6 md:grid-cols-3">
          {planConfigs.map((planOption) => {
            const isCurrentPlan = plan_type === planOption.plan_type;
            
            return (
              <Card 
                key={planOption.plan_type}
                className={planOption.is_highlighted ? 'border-primary shadow-lg' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{planOption.name}</CardTitle>
                    {isCurrentPlan && (
                      <Badge variant="default">Atual</Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{planOption.price_display}</span>
                    <span className="text-muted-foreground"> /mês</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {planOption.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={isCurrentPlan ? 'outline' : 'default'}
                    disabled={isCurrentPlan || isLoading}
                  >
                    {isCurrentPlan ? 'Plano Atual' : 'Fazer Upgrade'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Método de Pagamento (placeholder para futura integração) */}
      {!isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Método de Pagamento</CardTitle>
            <CardDescription>
              Gerencie seus métodos de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-muted rounded flex items-center justify-center">
                  <span className="text-xs font-bold">••••</span>
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expira em 12/2026</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Alterar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <EditPlanDialog
        plan={editingPlan}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={updatePlanConfig}
      />
    </div>
  );
}
