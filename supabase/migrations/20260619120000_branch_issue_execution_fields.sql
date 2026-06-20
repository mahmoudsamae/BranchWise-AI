ALTER TABLE public.branch_issues
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (workflow_status IN ('planning', 'in_progress', 'blocked', 'completed')),
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS stage_due_dates JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS activities JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.branch_issues
SET workflow_status = 'completed'
WHERE status = 'done' AND workflow_status <> 'completed';
