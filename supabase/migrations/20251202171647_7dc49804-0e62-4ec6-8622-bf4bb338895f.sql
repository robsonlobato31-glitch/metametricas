-- Create table for saved report templates
CREATE TABLE public.saved_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_report_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own templates"
ON public.saved_report_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
ON public.saved_report_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
ON public.saved_report_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
ON public.saved_report_templates FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_saved_report_templates_updated_at
BEFORE UPDATE ON public.saved_report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();