-- Create table for user column presets
CREATE TABLE public.user_column_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_name TEXT NOT NULL,
  preset_name TEXT NOT NULL,
  visible_columns TEXT[] NOT NULL DEFAULT '{}',
  column_order TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_column_presets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own presets" 
ON public.user_column_presets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presets" 
ON public.user_column_presets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets" 
ON public.user_column_presets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets" 
ON public.user_column_presets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_user_column_presets_user_page ON public.user_column_presets(user_id, page_name);

-- Add unique constraint for preset name per user and page
CREATE UNIQUE INDEX idx_user_column_presets_unique_name ON public.user_column_presets(user_id, page_name, preset_name);