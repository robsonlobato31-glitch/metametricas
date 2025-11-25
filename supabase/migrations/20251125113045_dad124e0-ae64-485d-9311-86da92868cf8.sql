-- ================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- POLICIES PARA user_roles
-- ================================================

-- Super admins podem ver todas as roles
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Usuários podem ver suas próprias roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins podem gerenciar roles (exceto super_admin)
CREATE POLICY "Admins can manage non-super-admin roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  AND role != 'super_admin'
);

-- Super admins podem gerenciar todas as roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- ================================================
-- POLICIES PARA user_plans
-- ================================================

-- Usuários podem ver seu próprio plano
CREATE POLICY "Users can view own plan"
ON public.user_plans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admins podem ver todos os planos
CREATE POLICY "Super admins can view all plans"
ON public.user_plans
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins podem gerenciar planos
CREATE POLICY "Admins can manage plans"
ON public.user_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Super admins podem gerenciar planos
CREATE POLICY "Super admins can manage plans"
ON public.user_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- ================================================
-- POLICIES PARA integrations
-- ================================================

-- Usuários podem ver suas próprias integrações
CREATE POLICY "Users can view own integrations"
ON public.integrations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Usuários podem criar suas próprias integrações
CREATE POLICY "Users can create own integrations"
ON public.integrations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias integrações
CREATE POLICY "Users can update own integrations"
ON public.integrations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias integrações
CREATE POLICY "Users can delete own integrations"
ON public.integrations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Super admins podem gerenciar todas as integrações
CREATE POLICY "Super admins can manage all integrations"
ON public.integrations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- ================================================
-- POLICIES PARA ad_accounts
-- ================================================

-- Usuários podem ver contas vinculadas às suas integrações
CREATE POLICY "Users can view own ad accounts"
ON public.ad_accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.integrations
    WHERE integrations.id = ad_accounts.integration_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem criar contas em suas integrações
CREATE POLICY "Users can create ad accounts"
ON public.ad_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.integrations
    WHERE integrations.id = ad_accounts.integration_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem atualizar suas contas
CREATE POLICY "Users can update own ad accounts"
ON public.ad_accounts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.integrations
    WHERE integrations.id = ad_accounts.integration_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem deletar suas contas
CREATE POLICY "Users can delete own ad accounts"
ON public.ad_accounts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.integrations
    WHERE integrations.id = ad_accounts.integration_id
      AND integrations.user_id = auth.uid()
  )
);

-- Super admins podem gerenciar todas as contas
CREATE POLICY "Super admins can manage all ad accounts"
ON public.ad_accounts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- ================================================
-- POLICIES PARA campaigns
-- ================================================

-- Usuários podem ver campanhas de suas contas
CREATE POLICY "Users can view own campaigns"
ON public.campaigns
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ad_accounts
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE ad_accounts.id = campaigns.ad_account_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem criar campanhas em suas contas
CREATE POLICY "Users can create campaigns"
ON public.campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ad_accounts
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE ad_accounts.id = campaigns.ad_account_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem atualizar suas campanhas
CREATE POLICY "Users can update own campaigns"
ON public.campaigns
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ad_accounts
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE ad_accounts.id = campaigns.ad_account_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem deletar suas campanhas
CREATE POLICY "Users can delete own campaigns"
ON public.campaigns
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ad_accounts
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE ad_accounts.id = campaigns.ad_account_id
      AND integrations.user_id = auth.uid()
  )
);

-- Super admins podem gerenciar todas as campanhas
CREATE POLICY "Super admins can manage all campaigns"
ON public.campaigns
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- ================================================
-- POLICIES PARA metrics
-- ================================================

-- Usuários podem ver métricas de suas campanhas
CREATE POLICY "Users can view own metrics"
ON public.metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    JOIN public.ad_accounts ON ad_accounts.id = campaigns.ad_account_id
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE campaigns.id = metrics.campaign_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem criar métricas para suas campanhas
CREATE POLICY "Users can create metrics"
ON public.metrics
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    JOIN public.ad_accounts ON ad_accounts.id = campaigns.ad_account_id
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE campaigns.id = metrics.campaign_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem atualizar suas métricas
CREATE POLICY "Users can update own metrics"
ON public.metrics
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    JOIN public.ad_accounts ON ad_accounts.id = campaigns.ad_account_id
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE campaigns.id = metrics.campaign_id
      AND integrations.user_id = auth.uid()
  )
);

-- Super admins podem gerenciar todas as métricas
CREATE POLICY "Super admins can manage all metrics"
ON public.metrics
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- ================================================
-- POLICIES PARA campaign_alerts
-- ================================================

-- Usuários podem ver alertas de suas campanhas
CREATE POLICY "Users can view own alerts"
ON public.campaign_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    JOIN public.ad_accounts ON ad_accounts.id = campaigns.ad_account_id
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE campaigns.id = campaign_alerts.campaign_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem criar alertas para suas campanhas
CREATE POLICY "Users can create alerts"
ON public.campaign_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    JOIN public.ad_accounts ON ad_accounts.id = campaigns.ad_account_id
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE campaigns.id = campaign_alerts.campaign_id
      AND integrations.user_id = auth.uid()
  )
);

-- Usuários podem atualizar seus alertas
CREATE POLICY "Users can update own alerts"
ON public.campaign_alerts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns
    JOIN public.ad_accounts ON ad_accounts.id = campaigns.ad_account_id
    JOIN public.integrations ON integrations.id = ad_accounts.integration_id
    WHERE campaigns.id = campaign_alerts.campaign_id
      AND integrations.user_id = auth.uid()
  )
);

-- Super admins podem gerenciar todos os alertas
CREATE POLICY "Super admins can manage all alerts"
ON public.campaign_alerts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- ================================================
-- POLICIES PARA sync_logs
-- ================================================

-- Usuários podem ver seus próprios logs
CREATE POLICY "Users can view own sync logs"
ON public.sync_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.integrations
    WHERE integrations.id = sync_logs.integration_id
      AND integrations.user_id = auth.uid()
  )
);

-- Apenas sistema pode criar logs (através de service_role)
CREATE POLICY "Service role can create sync logs"
ON public.sync_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Super admins podem ver todos os logs
CREATE POLICY "Super admins can view all sync logs"
ON public.sync_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Super admins podem gerenciar logs
CREATE POLICY "Super admins can manage sync logs"
ON public.sync_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));