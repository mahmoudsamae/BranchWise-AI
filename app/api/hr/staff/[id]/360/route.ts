import { NextResponse } from "next/server";

import { createFormSignedUrl } from "@/lib/company-forms/storage";
import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const { id: staffId } = await params;

  try {
    const supabase = createServiceRoleClient();

    const { data: staff, error: staffError } = await supabase
      .from("staff_members")
      .select("id, full_name, branch_id, position, employment_type, start_date, is_active, branches ( name )")
      .eq("id", staffId)
      .maybeSingle();

    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const { data: onboardingInvites } = await supabase
      .from("onboarding_invites")
      .select("id")
      .eq("staff_member_id", staffId);

    const onboardingInviteIds = (onboardingInvites ?? []).map((i) => i.id);

    const [onboardingRes, companySubRes, documentsRes, policyRes] = await Promise.all([
      onboardingInviteIds.length > 0
        ? supabase
            .from("onboarding_submissions")
            .select("id, status, submitted_at")
            .in("invite_id", onboardingInviteIds)
            .order("submitted_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("company_form_submissions")
        .select("id, module, status, submitted_at, company_form_templates ( title )")
        .eq("staff_member_id", staffId)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("staff_documents")
        .select("id, label, document_type, expires_at, file_path, file_name, mime_type, created_at")
        .eq("staff_member_id", staffId)
        .order("expires_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("company_form_invites")
        .select("id, status, created_at, submitted_at, company_form_templates!inner ( title )")
        .eq("staff_member_id", staffId)
        .eq("module", "policy")
        .order("created_at", { ascending: false }),
    ]);

    const onboarding = (onboardingRes.data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      submitted_at: row.submitted_at,
      type: "onboarding" as const,
    }));

    const companyForms = (companySubRes.data ?? []).map((row) => {
      const template = row.company_form_templates as { title: string } | null;
      return {
        id: row.id,
        module: row.module,
        title: template?.title ?? row.module,
        status: row.status,
        submitted_at: row.submitted_at,
      };
    });

    const documents = await Promise.all(
      (documentsRes.data ?? []).map(async (doc) => ({
        id: doc.id,
        label: doc.label,
        document_type: doc.document_type,
        expires_at: doc.expires_at,
        file_name: doc.file_name,
        created_at: doc.created_at,
        signed_url: doc.file_path ? await createFormSignedUrl(doc.file_path) : null,
        expiring_soon:
          doc.expires_at != null &&
          Date.parse(doc.expires_at) - Date.now() < 30 * 86400000 &&
          Date.parse(doc.expires_at) >= Date.now(),
        expired: doc.expires_at != null && Date.parse(doc.expires_at) < Date.now(),
      })),
    );

    const policies = (policyRes.data ?? []).map((row) => {
      const template = row.company_form_templates as { title: string } | null;
      return {
        id: row.id,
        title: template?.title ?? "Policy",
        status: row.status,
        created_at: row.created_at,
        submitted_at: row.submitted_at,
      };
    });

    const branch = staff.branches as { name: string } | null;

    return NextResponse.json({
      staff: {
        id: staff.id,
        full_name: staff.full_name,
        branch_name: branch?.name ?? null,
        position: staff.position,
        employment_type: staff.employment_type,
        start_date: staff.start_date,
        is_active: staff.is_active,
      },
      onboarding,
      company_forms: companyForms,
      documents,
      policies,
      summary: {
        onboarding_count: onboarding.length,
        document_count: documents.length,
        expiring_documents: documents.filter((d) => d.expiring_soon).length,
        expired_documents: documents.filter((d) => d.expired).length,
        pending_policies: policies.filter((p) => p.status === "pending" || p.status === "in_progress").length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
