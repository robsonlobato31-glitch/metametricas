-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create table to store sync schedules per user
CREATE TABLE public.sync_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'google')),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('campaigns', 'metrics', 'full')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'hourly' CHECK (frequency IN ('hourly', 'daily', 'weekly')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, sync_type)
);

-- Enable Row Level Security
ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own schedules"
ON public.sync_schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedules"
ON public.sync_schedules FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules"
ON public.sync_schedules FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules"
ON public.sync_schedules FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all schedules"
ON public.sync_schedules FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sync_schedules_updated_at
BEFORE UPDATE ON public.sync_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();