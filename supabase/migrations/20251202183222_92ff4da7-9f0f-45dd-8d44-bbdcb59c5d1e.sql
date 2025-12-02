-- Clean up duplicate report_templates, keeping only the most recent per user
DELETE FROM public.report_templates
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.report_templates
  ORDER BY user_id, updated_at DESC
);

-- Add unique constraint on user_id to prevent future duplicates
ALTER TABLE public.report_templates
ADD CONSTRAINT report_templates_user_id_unique UNIQUE (user_id);