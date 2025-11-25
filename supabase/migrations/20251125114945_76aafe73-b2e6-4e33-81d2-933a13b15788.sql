-- Function to get all users with their roles and plans (Super Admin only)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  roles app_role[],
  plan_type plan_type,
  plan_status plan_status,
  plan_max_accounts int,
  plan_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is a super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can view all users';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    COALESCE(ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[]) as roles,
    up.plan_type,
    up.status as plan_status,
    up.max_accounts as plan_max_accounts,
    up.expires_at as plan_expires_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  LEFT JOIN public.user_plans up ON up.user_id = au.id
  GROUP BY au.id, au.email, au.created_at, au.last_sign_in_at, up.plan_type, up.status, up.max_accounts, up.expires_at
  ORDER BY au.created_at DESC;
END;
$$;

-- Function to assign role to user (Super Admin only)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id uuid,
  p_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is a super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can assign roles';
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (p_user_id, p_role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Function to remove role from user (Super Admin only)
CREATE OR REPLACE FUNCTION public.remove_user_role(
  p_user_id uuid,
  p_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is a super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can remove roles';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id AND role = p_role;
END;
$$;

-- Function to update user plan (Super Admin only)
CREATE OR REPLACE FUNCTION public.update_user_plan(
  p_user_id uuid,
  p_plan_type plan_type,
  p_max_accounts int,
  p_status plan_status,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is a super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can update user plans';
  END IF;

  INSERT INTO public.user_plans (user_id, plan_type, max_accounts, status, expires_at)
  VALUES (p_user_id, p_plan_type, p_max_accounts, p_status, p_expires_at)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    plan_type = EXCLUDED.plan_type,
    max_accounts = EXCLUDED.max_accounts,
    status = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
END;
$$;