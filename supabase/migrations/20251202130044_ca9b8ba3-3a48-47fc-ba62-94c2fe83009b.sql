-- Create spending_alerts table for custom user alerts
CREATE TABLE public.spending_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'daily_spend', 'monthly_spend', 'cpc', 'ctr', 'cpm'
  condition TEXT NOT NULL DEFAULT 'greater_than', -- 'greater_than', 'less_than'
  threshold_amount NUMERIC NOT NULL,
  provider TEXT, -- 'meta', 'google', NULL para todas
  ad_account_id UUID REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  send_email BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spending_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own spending alerts" 
ON public.spending_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own spending alerts" 
ON public.spending_alerts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spending alerts" 
ON public.spending_alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own spending alerts" 
ON public.spending_alerts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Super admin access
CREATE POLICY "Super admins can manage all spending alerts" 
ON public.spending_alerts 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_spending_alerts_updated_at
BEFORE UPDATE ON public.spending_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();