CREATE TABLE IF NOT EXISTS public.export_delivery_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('weekly', 'management', 'comparison')),
  day_of_week SMALLINT NOT NULL DEFAULT 0 CHECK (day_of_week BETWEEN 0 AND 6),
  hour_utc SMALLINT NOT NULL DEFAULT 7 CHECK (hour_utc BETWEEN 0 AND 23),
  branch_ids UUID[] DEFAULT '{}',
  all_branches BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS export_delivery_schedules_user_idx
  ON public.export_delivery_schedules (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS export_delivery_schedules_active_idx
  ON public.export_delivery_schedules (is_active)
  WHERE is_active = true;
