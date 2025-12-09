-- Phase 1: Add UNIQUE constraints to ad_sets and ads tables

-- Clean up duplicate ad_sets (keep most recent)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY campaign_id, ad_set_id ORDER BY updated_at DESC) as rn
  FROM public.ad_sets
)
DELETE FROM public.ad_sets
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Clean up duplicate ads (keep most recent)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY ad_set_id, ad_id ORDER BY updated_at DESC) as rn
  FROM public.ads
)
DELETE FROM public.ads
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Add UNIQUE constraint to ad_sets
ALTER TABLE public.ad_sets
ADD CONSTRAINT ad_sets_campaign_adset_unique UNIQUE (campaign_id, ad_set_id);

-- Add UNIQUE constraint to ads
ALTER TABLE public.ads
ADD CONSTRAINT ads_adset_ad_unique UNIQUE (ad_set_id, ad_id);

-- Clean up stuck sync_logs
UPDATE public.sync_logs
SET status = 'timeout', 
    finished_at = NOW(),
    error_message = 'Sync timed out - cleaned up automatically'
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '10 minutes';

-- Add index for ads performance queries
CREATE INDEX IF NOT EXISTS idx_ads_ad_set_id ON public.ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON public.ad_sets(campaign_id);