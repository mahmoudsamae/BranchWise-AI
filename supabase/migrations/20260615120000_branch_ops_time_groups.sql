ALTER TABLE public.branch_ops_daily_items
  ADD COLUMN IF NOT EXISTS time_group TEXT NOT NULL DEFAULT 'morning'
  CHECK (time_group IN ('morning', 'midday', 'evening'));
