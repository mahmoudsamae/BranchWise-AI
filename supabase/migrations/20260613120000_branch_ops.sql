-- Branch Ops Hub: custom operational tables per branch + permanent staff-facing link.

CREATE TABLE IF NOT EXISTS public.branch_ops_tokens (
  branch_id UUID PRIMARY KEY REFERENCES public.branches(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS branch_ops_tokens_token_idx ON public.branch_ops_tokens (token);

CREATE TABLE IF NOT EXISTS public.branch_ops_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_type TEXT NOT NULL CHECK (table_type IN ('log', 'daily')),
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS branch_ops_tables_branch_idx
  ON public.branch_ops_tables (branch_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.branch_ops_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.branch_ops_tables(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS branch_ops_rows_table_date_idx
  ON public.branch_ops_rows (table_id, work_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.branch_ops_daily_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.branch_ops_tables(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  time_hint TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS branch_ops_daily_items_table_idx
  ON public.branch_ops_daily_items (table_id, sort_order);

CREATE TABLE IF NOT EXISTS public.branch_ops_daily_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_item_id UUID NOT NULL REFERENCES public.branch_ops_daily_items(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (daily_item_id, work_date)
);

CREATE INDEX IF NOT EXISTS branch_ops_daily_completions_date_idx
  ON public.branch_ops_daily_completions (work_date DESC);
