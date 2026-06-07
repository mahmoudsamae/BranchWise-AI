CREATE TABLE IF NOT EXISTS public.export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  branches TEXT,
  format TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS export_history_user_idx
  ON public.export_history (user_id, generated_at DESC);
