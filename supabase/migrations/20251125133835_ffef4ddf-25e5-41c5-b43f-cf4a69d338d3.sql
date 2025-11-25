-- Tabela para armazenar configurações dos planos
CREATE TABLE IF NOT EXISTS public.plan_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type plan_type NOT NULL UNIQUE,
  name text NOT NULL,
  price_display text NOT NULL,
  price_amount numeric NOT NULL,
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_highlighted boolean DEFAULT false,
  is_active boolean DEFAULT true,
  hotmart_url text,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_configurations ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active plans
CREATE POLICY "Anyone can view active plan configurations"
ON public.plan_configurations
FOR SELECT
USING (is_active = true);

-- Policy: Super admins can manage all configurations
CREATE POLICY "Super admins can manage plan configurations"
ON public.plan_configurations
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_plan_configurations_updated_at
BEFORE UPDATE ON public.plan_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações padrão dos planos
INSERT INTO public.plan_configurations (plan_type, name, price_display, price_amount, description, features, is_highlighted, display_order)
VALUES 
  ('survival', 'Básico', 'R$ 97', 97.00, 'Plano inicial para começar', 
   '["Até 3 campanhas", "1 usuário", "Relatórios básicos", "Suporte por email"]'::jsonb, 
   false, 1),
  ('professional', 'Pro', 'R$ 297', 297.00, 'Melhor para profissionais', 
   '["Campanhas ilimitadas", "5 usuários", "Relatórios avançados", "Suporte prioritário", "IA incluída"]'::jsonb, 
   true, 2),
  ('enterprise', 'Enterprise', 'R$ 997', 997.00, 'Solução completa para empresas', 
   '["Tudo do Pro", "Usuários ilimitados", "White label", "Suporte dedicado", "API custom"]'::jsonb, 
   false, 3)
ON CONFLICT (plan_type) DO NOTHING;