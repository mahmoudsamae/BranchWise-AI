import { NextResponse } from "next/server";

import { isCompanyFormModule, type CompanyFormModule } from "@/lib/company-forms/modules";

export function parseModuleParam(raw: string): CompanyFormModule | NextResponse {
  if (!isCompanyFormModule(raw)) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 });
  }
  return raw;
}

export function isErrorResponse(v: CompanyFormModule | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}
