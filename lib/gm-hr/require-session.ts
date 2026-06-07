import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { getSessionUserServer } from "@/lib/session";
import { requireSuperAdminApi } from "@/lib/super-admin/require-session";

export async function requireGmOrHrApi() {
  const session = await getSessionUserServer();
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "general_manager" && session.role !== "hr") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

export async function requireGmHrOrSuperAdminApi() {
  const gmHr = await requireGmOrHrApi();
  if (gmHr.ok) return gmHr;

  const superAdmin = await requireSuperAdminApi();
  if (superAdmin.ok) return superAdmin;

  return gmHr.response.status === 401 ? gmHr : superAdmin;
}

export async function requireGeneralManagerOrSuperAdminApi() {
  const gm = await requireGeneralManagerApi();
  if (gm.ok) return gm;

  const superAdmin = await requireSuperAdminApi();
  if (superAdmin.ok) return superAdmin;

  return gm.response.status === 401 ? gm : superAdmin;
}

export async function requireHrOrBranchManagerApi() {
  const branch = await requireBranchManagerApi();
  if (branch.ok) return branch;

  const hr = await requireHrApi();
  if (hr.ok && hr.session.role === "hr") return hr;

  if (!hr.ok && !branch.ok && hr.response.status === 401 && branch.response.status === 401) {
    return hr;
  }

  return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function requireGeneralManagerApi() {
  const session = await getSessionUserServer();
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "general_manager") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

export async function requireHrApi() {
  const session = await getSessionUserServer();
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "hr" && session.role !== "super_admin") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}
