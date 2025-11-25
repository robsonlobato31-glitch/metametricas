-- Create user_onboarding table
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  completed_steps TEXT[] DEFAULT '{}',
  tour_completed BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Users can view their own onboarding
CREATE POLICY "Users can view own onboarding"
  ON public.user_onboarding
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own onboarding
CREATE POLICY "Users can insert own onboarding"
  ON public.user_onboarding
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own onboarding
CREATE POLICY "Users can update own onboarding"
  ON public.user_onboarding
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Super admins can view all onboarding records
CREATE POLICY "Super admins can view all onboarding"
  ON public.user_onboarding
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create dashboard_layouts table
CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  layout JSONB NOT NULL DEFAULT '[]',
  widgets JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own layout
CREATE POLICY "Users can view own layout"
  ON public.dashboard_layouts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own layout
CREATE POLICY "Users can insert own layout"
  ON public.dashboard_layouts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own layout
CREATE POLICY "Users can update own layout"
  ON public.dashboard_layouts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own layout
CREATE POLICY "Users can delete own layout"
  ON public.dashboard_layouts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Super admins can view all layouts
CREATE POLICY "Super admins can view all layouts"
  ON public.dashboard_layouts
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger to update updated_at on user_onboarding
CREATE TRIGGER update_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on dashboard_layouts
CREATE TRIGGER update_dashboard_layouts_updated_at
  BEFORE UPDATE ON public.dashboard_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();