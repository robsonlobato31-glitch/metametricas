-- ================================================
-- TRIGGERS AUTOMÁTICOS
-- ================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Aplicar trigger em todas as tabelas com updated_at
CREATE TRIGGER update_user_plans_updated_at
BEFORE UPDATE ON public.user_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
BEFORE UPDATE ON public.integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_accounts_updated_at
BEFORE UPDATE ON public.ad_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_metrics_updated_at
BEFORE UPDATE ON public.metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- TRIGGER: Criar role 'user' padrão ao cadastrar
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (NEW.id, 'user', NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();

-- ================================================
-- TRIGGER: Criar plano 'survival' padrão ao cadastrar
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan_type, max_accounts, status)
  VALUES (NEW.id, 'survival', 2, 'active');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_plan
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_plan();

-- ================================================
-- TRIGGER: Criar integração Google ao login social
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_google_oauth_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_token TEXT;
  provider_refresh_token TEXT;
  token_expires_at TIMESTAMPTZ;
BEGIN
  -- Verifica se é login via Google OAuth
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    -- Extrai tokens do raw_app_meta_data
    provider_token := NEW.raw_user_meta_data->>'provider_token';
    provider_refresh_token := NEW.raw_user_meta_data->>'provider_refresh_token';
    
    -- Se existe provider_token, cria/atualiza integração
    IF provider_token IS NOT NULL THEN
      -- Calcula expires_at (Google tokens expiram em 1 hora)
      token_expires_at := NOW() + INTERVAL '1 hour';
      
      -- Upsert na tabela integrations
      INSERT INTO public.integrations (
        user_id, 
        provider, 
        access_token, 
        refresh_token, 
        expires_at, 
        status, 
        integration_source
      )
      VALUES (
        NEW.id,
        'google',
        provider_token,
        provider_refresh_token,
        token_expires_at,
        'active',
        'social_login'
      )
      ON CONFLICT (user_id, provider) 
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, integrations.refresh_token),
        expires_at = EXCLUDED.expires_at,
        status = 'active',
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_google_oauth_login
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_google_oauth_login();