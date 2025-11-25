-- Create storage bucket for report logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-logos', 'report-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for report logos bucket
CREATE POLICY "Users can view their own logo"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'report-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'report-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'report-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'report-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create report_templates table
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#64748B',
  header_text TEXT DEFAULT 'Relatório de Campanhas',
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own template"
ON public.report_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own template"
ON public.report_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own template"
ON public.report_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own template"
ON public.report_templates FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();