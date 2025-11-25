-- Fase 4: Multi-tenancy (Workspaces)

-- Tabela de workspaces (agências/organizações)
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de membros do workspace
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role workspace_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Tabela de convites para workspace
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

CREATE TABLE public.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(workspace_id, email, status)
);

-- Tabela de white-label (personalização de marca)
CREATE TABLE public.workspace_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#64748B',
  company_name TEXT,
  custom_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fase 5: Adicionar trial period aos planos
ALTER TABLE public.user_plans 
ADD COLUMN trial_ends_at TIMESTAMPTZ,
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT;

-- Atribuir rowaizemarketing@gmail.com como super_admin
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Buscar o ID do usuário
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'rowaizemarketing@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Inserir role de super_admin se não existir
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Atualizar plano para enterprise sem limites
    INSERT INTO public.user_plans (user_id, plan_type, max_accounts, status)
    VALUES (target_user_id, 'enterprise', 999999, 'active')
    ON CONFLICT (user_id) DO UPDATE
    SET 
      plan_type = 'enterprise',
      max_accounts = 999999,
      status = 'active',
      updated_at = now();
  END IF;
END $$;

-- RLS Policies para workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspaces they are members of"
ON public.workspaces FOR SELECT
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspaces.id AND user_id = auth.uid()
  ) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Users can create their own workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update workspaces"
ON public.workspaces FOR UPDATE
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspaces.id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  ) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Owners can delete workspaces"
ON public.workspaces FOR DELETE
USING (
  auth.uid() = owner_id OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- RLS Policies para workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view members of their workspaces"
ON public.workspace_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
  ) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins and owners can manage members"
ON public.workspace_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'owner')
  ) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- RLS Policies para workspace_invites
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invites of their workspaces"
ON public.workspace_invites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_invites.workspace_id 
    AND wm.user_id = auth.uid()
  ) OR
  auth.uid() = invited_by OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins and owners can create invites"
ON public.workspace_invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_invites.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'owner')
  ) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins and owners can update invites"
ON public.workspace_invites FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_invites.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'owner')
  ) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- RLS Policies para workspace_branding
ALTER TABLE public.workspace_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view branding of their workspaces"
ON public.workspace_branding FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_branding.workspace_id 
    AND wm.user_id = auth.uid()
  ) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins and owners can manage branding"
ON public.workspace_branding FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_branding.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'owner')
  ) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_members_updated_at
BEFORE UPDATE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_branding_updated_at
BEFORE UPDATE ON public.workspace_branding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar workspace automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workspace_id UUID;
  user_email TEXT;
BEGIN
  user_email := NEW.email;
  
  -- Criar workspace pessoal
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (
    COALESCE(SPLIT_PART(user_email, '@', 1), 'workspace'),
    LOWER(REPLACE(SPLIT_PART(user_email, '@', 1), '.', '-')) || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 8),
    NEW.id
  )
  RETURNING id INTO workspace_id;
  
  -- Adicionar usuário como owner do workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (workspace_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

-- Trigger para criar workspace ao registrar novo usuário
CREATE TRIGGER on_auth_user_workspace_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_workspace();