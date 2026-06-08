CREATE TABLE IF NOT EXISTS public.ai_summaries (
  report_id UUID PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
