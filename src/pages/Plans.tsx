import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { usePlan } from '@/hooks/usePlan';
import { useUserRole } from '@/hooks/useUserRole';

const plans = [
  {
    name: 'Básico',
    price: 'R$ 97',
    period: '/mês',
    features: [
      'Até 3 campanhas',
      '1 usuário',
      'Relatórios básicos',
      'Suporte por email',
    ],
    type: 'basic' as const,
  },
  {
    name: 'Pro',
    price: 'R$ 297',
    period: '/mês',
    features: [
      'Campanhas ilimitadas',
      '5 usuários',
      'Relatórios avançados',
      'Suporte prioritário',
      'IA incluída',
    ],
    type: 'pro' as const,
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'R$ 997',
    period: '/mês',
    features: [
      'Tudo do Pro',
      'Usuários ilimitados',
      'White label',
      'Suporte dedicado',
      'API custom',
    ],
    type: 'enterprise' as const,
  },
];

export default function Plans() {
  const { plan_type, accounts_used, max_accounts, trial_ends_at, isLoading } = usePlan();
  const { isSuperAdmin } = useUserRole();

  const isTrialActive = trial_ends_at && new Date(trial_ends_at) > new Date();

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

      {/* Planos Disponíveis */}
      {!isSuperAdmin && (
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((planOption) => {
            const isCurrentPlan = plan_type === planOption.type;
            
            return (
              <Card 
                key={planOption.name}
                className={planOption.highlighted ? 'border-primary shadow-lg' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{planOption.name}</CardTitle>
                    {isCurrentPlan && (
                      <Badge variant="default">Atual</Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{planOption.price}</span>
                    <span className="text-muted-foreground">{planOption.period}</span>
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
    </div>
  );
}
