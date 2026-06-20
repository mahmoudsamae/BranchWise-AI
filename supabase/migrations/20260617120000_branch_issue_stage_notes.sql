ALTER TABLE public.branch_issues
  ADD COLUMN IF NOT EXISTS stage_notes JSONB NOT NULL DEFAULT '{}'::jsonb;
