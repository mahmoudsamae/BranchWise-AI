ALTER TABLE public.branch_issues
  ADD COLUMN IF NOT EXISTS stage_checklists JSONB NOT NULL DEFAULT '{}'::jsonb;
