-- Remove recurring report schedules, export delivery schedules, and shift handover module.

DROP TABLE IF EXISTS public.export_delivery_schedules CASCADE;
DROP TABLE IF EXISTS public.recurring_schedules CASCADE;

DELETE FROM public.company_form_submissions WHERE module = 'shift_handover';
DELETE FROM public.company_form_invites WHERE module = 'shift_handover';
DELETE FROM public.company_form_templates WHERE module = 'shift_handover';

ALTER TABLE public.company_form_templates DROP CONSTRAINT IF EXISTS company_form_templates_module_check;
ALTER TABLE public.company_form_templates ADD CONSTRAINT company_form_templates_module_check
  CHECK (module IN ('document_renewal', 'policy', 'incident'));

ALTER TABLE public.company_form_invites DROP CONSTRAINT IF EXISTS company_form_invites_module_check;
ALTER TABLE public.company_form_invites ADD CONSTRAINT company_form_invites_module_check
  CHECK (module IN ('document_renewal', 'policy', 'incident'));

ALTER TABLE public.company_form_submissions DROP CONSTRAINT IF EXISTS company_form_submissions_module_check;
ALTER TABLE public.company_form_submissions ADD CONSTRAINT company_form_submissions_module_check
  CHECK (module IN ('document_renewal', 'policy', 'incident'));
