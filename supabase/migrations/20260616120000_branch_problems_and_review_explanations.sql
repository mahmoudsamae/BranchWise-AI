-- Problems & Projects tracker for branch managers
CREATE TABLE IF NOT EXISTS public.branch_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('problem', 'project')),
  title TEXT NOT NULL,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_stage INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  cost_estimate NUMERIC(10,2),
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS branch_issues_branch_idx
  ON public.branch_issues (branch_id, status, updated_at DESC);

-- Manager-written context for negative Google reviews (≤3★) awaiting a reply
CREATE TABLE IF NOT EXISTS public.branch_review_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  review_signature TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating INT NOT NULL,
  review_text TEXT NOT NULL,
  explanation TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT branch_review_explanations_unique UNIQUE (branch_id, review_signature)
);

CREATE INDEX IF NOT EXISTS branch_review_explanations_branch_idx
  ON public.branch_review_explanations (branch_id);
