-- Shared company forms: document renewal, policies, incidents, shift handover.

CREATE TABLE IF NOT EXISTS public.company_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('document_renewal', 'policy', 'incident', 'shift_handover')),
  title TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_form_templates_module_idx
  ON public.company_form_templates (module, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.company_form_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('document_renewal', 'policy', 'incident', 'shift_handover')),
  token TEXT NOT NULL UNIQUE,
  template_id UUID NOT NULL REFERENCES public.company_form_templates(id) ON DELETE RESTRICT,
  subject_name TEXT NOT NULL,
  staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'submitted', 'expired', 'acknowledged')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS company_form_invites_module_idx
  ON public.company_form_invites (module, status, created_at DESC);

CREATE INDEX IF NOT EXISTS company_form_invites_token_idx
  ON public.company_form_invites (token);

CREATE TABLE IF NOT EXISTS public.company_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('document_renewal', 'policy', 'incident', 'shift_handover')),
  template_id UUID NOT NULL REFERENCES public.company_form_templates(id) ON DELETE RESTRICT,
  invite_id UUID UNIQUE REFERENCES public.company_form_invites(id) ON DELETE SET NULL,
  staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  submitted_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  shift_date DATE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewed', 'acknowledged')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS company_form_submissions_module_idx
  ON public.company_form_submissions (module, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS company_form_submissions_staff_idx
  ON public.company_form_submissions (staff_member_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.staff_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'general',
  expires_at DATE,
  file_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  submission_id UUID REFERENCES public.company_form_submissions(id) ON DELETE SET NULL,
  last_alert_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_documents_expiry_idx
  ON public.staff_documents (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS staff_documents_staff_idx
  ON public.staff_documents (staff_member_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.branch_incident_tokens (
  branch_id UUID PRIMARY KEY REFERENCES public.branches(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  template_id UUID REFERENCES public.company_form_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS branch_incident_tokens_token_idx
  ON public.branch_incident_tokens (token);

ALTER TABLE public.onboarding_invites
  ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;
