import { NextResponse } from "next/server";

import { resolveIncidentByBranchToken } from "@/lib/company-forms/resolve-invite";
import {
  ALLOWED_FORM_MIME_TYPES,
  COMPANY_FILES_BUCKET,
  MAX_FORM_FILE_BYTES,
  buildFormStoragePath,
} from "@/lib/company-forms/storage";
import { createServiceRoleClient } from "@/lib/supabase";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const resolved = await resolveIncidentByBranchToken(token);
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
  if (!fieldId || !(file instanceof File)) {
    return NextResponse.json({ error: "field_id and file are required" }, { status: 400 });
  }

  const field = resolved.fields.find((f) => f.id === fieldId);
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

  const storagePath = buildFormStoragePath(`incident-${resolved.branch_id}`, fieldId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const supabase = createServiceRoleClient();
    const { error: uploadError } = await supabase.storage.from(COMPANY_FILES_BUCKET).upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({
      file: { path: storagePath, fileName: file.name, mimeType, size: file.size },
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
