import { NextResponse } from "next/server";

import { isErrorResponse, parseModuleParam } from "@/lib/company-forms/api-helpers";
import {
  ALLOWED_FORM_MIME_TYPES,
  COMPANY_FILES_BUCKET,
  MAX_FORM_FILE_BYTES,
  buildFormStoragePath,
} from "@/lib/company-forms/storage";
import { resolveCompanyFormInvite } from "@/lib/company-forms/resolve-invite";
import { createServiceRoleClient } from "@/lib/supabase";

type Params = { params: Promise<{ module: string; token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { module: moduleRaw, token } = await params;
  const module = parseModuleParam(moduleRaw);
  if (isErrorResponse(module)) return module;

  const resolved = await resolveCompanyFormInvite(module, token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const fieldId = String(formData.get("field_id") ?? "").trim();
  const file = formData.get("file");
  if (!fieldId) return NextResponse.json({ error: "field_id is required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const field = resolved.invite.fields.find((f) => f.id === fieldId);
  if (!field || field.type !== "file") {
    return NextResponse.json({ error: "Invalid file field" }, { status: 400 });
  }

  if (file.size > MAX_FORM_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_FORM_MIME_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  const storagePath = buildFormStoragePath(resolved.invite.id, fieldId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const supabase = createServiceRoleClient();
    if (resolved.invite.status === "pending") {
      await supabase.from("company_form_invites").update({ status: "in_progress" }).eq("id", resolved.invite.id);
    }

    const { error: uploadError } = await supabase.storage.from(COMPANY_FILES_BUCKET).upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (uploadError) {
      const msg = uploadError.message?.toLowerCase().includes("bucket")
        ? "File storage is not configured. Please contact HR."
        : uploadError.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({
      file: { path: storagePath, fileName: file.name, mimeType, size: file.size },
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
