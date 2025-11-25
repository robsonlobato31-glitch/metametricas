-- Create table for metric breakdowns (segmentation by age, gender, device)
CREATE TABLE public.metric_breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  breakdown_type text NOT NULL CHECK (breakdown_type IN ('age', 'gender', 'device_platform', 'publisher_platform')),
  breakdown_value text NOT NULL,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions integer DEFAULT 0,
  results integer DEFAULT 0,
  messages integer DEFAULT 0,
  ctr numeric,
  cpc numeric,
  cost_per_result numeric,
  cost_per_message numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_breakdown UNIQUE(campaign_id, date, breakdown_type, breakdown_value)
);

-- Create table for user column preferences
CREATE TABLE public.user_column_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_name text NOT NULL CHECK (page_name IN ('campaigns', 'budget_dashboard', 'metrics', 'dashboard')),
  visible_columns text[] NOT NULL DEFAULT '{}',
  column_order text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_page UNIQUE(user_id, page_name)
);

-- Enable RLS on metric_breakdowns
ALTER TABLE public.metric_breakdowns ENABLE ROW LEVEL SECURITY;

-- RLS policies for metric_breakdowns
CREATE POLICY "Users can view own metric breakdowns"
  ON public.metric_breakdowns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
      JOIN public.integrations i ON i.id = aa.integration_id
      WHERE c.id = metric_breakdowns.campaign_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own metric breakdowns"
  ON public.metric_breakdowns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
      JOIN public.integrations i ON i.id = aa.integration_id
      WHERE c.id = metric_breakdowns.campaign_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own metric breakdowns"
  ON public.metric_breakdowns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.ad_accounts aa ON aa.id = c.ad_account_id
      JOIN public.integrations i ON i.id = aa.integration_id
      WHERE c.id = metric_breakdowns.campaign_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage all metric breakdowns"
  ON public.metric_breakdowns FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Enable RLS on user_column_preferences
ALTER TABLE public.user_column_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_column_preferences
CREATE POLICY "Users can view own column preferences"
  ON public.user_column_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own column preferences"
  ON public.user_column_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own column preferences"
  ON public.user_column_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own column preferences"
  ON public.user_column_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all column preferences"
  ON public.user_column_preferences FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_metric_breakdowns_campaign_date ON public.metric_breakdowns(campaign_id, date);
CREATE INDEX idx_metric_breakdowns_type_value ON public.metric_breakdowns(breakdown_type, breakdown_value);
CREATE INDEX idx_user_column_prefs_user_page ON public.user_column_preferences(user_id, page_name);

-- Create trigger for updated_at
CREATE TRIGGER update_metric_breakdowns_updated_at
  BEFORE UPDATE ON public.metric_breakdowns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_column_preferences_updated_at
  BEFORE UPDATE ON public.user_column_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();