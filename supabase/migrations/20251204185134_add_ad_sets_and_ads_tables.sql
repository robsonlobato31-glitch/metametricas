-- Create ad_sets table for Meta Ads ad set level data
CREATE TABLE IF NOT EXISTS public.ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_set_id TEXT NOT NULL, -- ID do conjunto de anúncios no Meta Ads
  name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'ACTIVE', 'PAUSED', 'DELETED', etc.
  optimization_goal TEXT, -- 'CONVERSIONS', 'REACH', 'LINK_CLICKS', etc.
  billing_event TEXT, -- 'IMPRESSIONS', 'LINK_CLICKS', etc.
  bid_amount NUMERIC,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  start_date DATE,
  end_date DATE,
  targeting JSONB, -- Store targeting criteria as JSON
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, ad_set_id)
);

-- Create ads table for Meta Ads individual ad level data
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_set_id UUID NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  ad_id TEXT NOT NULL, -- ID do anúncio no Meta Ads
  name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'ACTIVE', 'PAUSED', 'DELETED', etc.
  creative_id TEXT,
  creative_name TEXT,
  creative_type TEXT, -- 'IMAGE', 'VIDEO', 'CAROUSEL', etc.
  creative_url TEXT,
  ad_format TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ad_set_id, ad_id)
);

-- Add optional references to ad_sets and ads in metrics table
ALTER TABLE public.metrics 
  ADD COLUMN IF NOT EXISTS ad_set_id UUID REFERENCES ad_sets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ad_id UUID REFERENCES ads(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON public.ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_status ON public.ad_sets(status);
CREATE INDEX IF NOT EXISTS idx_ads_ad_set_id ON public.ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON public.ads(status);
CREATE INDEX IF NOT EXISTS idx_metrics_ad_set_id ON public.metrics(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_metrics_ad_id ON public.metrics(ad_id);

-- Enable RLS on new tables
ALTER TABLE public.ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ad_sets
CREATE POLICY "Users can view their own ad sets"
  ON public.ad_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE c.id = ad_sets.campaign_id
      AND aa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own ad sets"
  ON public.ad_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE c.id = ad_sets.campaign_id
      AND aa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own ad sets"
  ON public.ad_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE c.id = ad_sets.campaign_id
      AND aa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own ad sets"
  ON public.ad_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE c.id = ad_sets.campaign_id
      AND aa.user_id = auth.uid()
    )
  );

-- Create RLS policies for ads
CREATE POLICY "Users can view their own ads"
  ON public.ads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ad_sets ads_set
      JOIN campaigns c ON ads_set.campaign_id = c.id
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE ads_set.id = ads.ad_set_id
      AND aa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own ads"
  ON public.ads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_sets ads_set
      JOIN campaigns c ON ads_set.campaign_id = c.id
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE ads_set.id = ads.ad_set_id
      AND aa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own ads"
  ON public.ads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ad_sets ads_set
      JOIN campaigns c ON ads_set.campaign_id = c.id
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE ads_set.id = ads.ad_set_id
      AND aa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own ads"
  ON public.ads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ad_sets ads_set
      JOIN campaigns c ON ads_set.campaign_id = c.id
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE ads_set.id = ads.ad_set_id
      AND aa.user_id = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_ad_sets_updated_at
  BEFORE UPDATE ON public.ad_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
