-- Enable realtime for campaign_alerts table
ALTER TABLE public.campaign_alerts REPLICA IDENTITY FULL;

-- Add campaign_alerts to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_alerts;