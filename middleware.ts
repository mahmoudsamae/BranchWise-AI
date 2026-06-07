import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { BW_SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import type { AppRole } from "@/types/user";

const ROUTE_RULES = [
  { prefix: "/api/super-admin", roles: ["super_admin"] as const },
  { prefix: "/api/branch/", roles: ["branch_manager"] as const },
  { prefix: "/api/hr/", roles: ["hr", "super_admin"] as const },
  { prefix: "/api/analytics", roles: ["general_manager"] as const },
  { prefix: "/api/dashboard", roles: ["general_manager"] as const },
  { prefix: "/api/fruhstuck", roles: ["general_manager"] as const },
  { prefix: "/api/branches", roles: ["super_admin", "general_manager", "hr"] as const },
  { prefix: "/api/templates", roles: ["general_manager", "hr"] as const },
  { prefix: "/api/reports", roles: ["general_manager", "hr"] as const },
  { prefix: "/api/report-requests", roles: ["general_manager", "hr"] as const },
  { prefix: "/api/schedules", roles: ["general_manager", "hr"] as const },
  { prefix: "/api/exports", roles: ["general_manager", "hr"] as const },
  { prefix: "/api/ki-chat", roles: ["general_manager", "hr"] as const },
  { prefix: "/api/channels", roles: ["general_manager", "hr", "branch_manager"] as const },
] as const;

const STAFF_DISCUSSION = ["/api/staff-report-entries/", "/api/notifications"] as const;
const BRANCH_REVIEWS = /^\/api\/branches\/[^/]+\/reviews$/;
const HOME: Record<AppRole, string> = { super_admin: "/super-admin", general_manager: "/dashboard", hr: "/hr", branch_manager: "/branch" };
const PAGE_ROLES: [string, AppRole][] = [["/super-admin", "super_admin"], ["/dashboard", "general_manager"], ["/hr", "hr"], ["/branch", "branch_manager"]];

function home(role: AppRole) {
  return HOME[role] ?? "/login";
}

function protectedApi(path: string) {
  return STAFF_DISCUSSION.some((p) => path.startsWith(p)) || ROUTE_RULES.some((r) => path.startsWith(r.prefix));
}

function pageOk(role: AppRole, path: string) {
  const match = PAGE_ROLES.find(([prefix]) => path.startsWith(prefix));
  return !match || match[1] === role;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(BW_SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/api/auth/") || pathname === "/api/setup") return NextResponse.next();
  if (pathname.startsWith("/api/onboarding/")) return NextResponse.next();
  if (pathname.startsWith("/api/forms/")) return NextResponse.next();
  if (pathname.startsWith("/api/incident/")) return NextResponse.next();
  if (pathname.startsWith("/api/ops/")) return NextResponse.next();
  if (pathname.startsWith("/onboarding/")) return NextResponse.next();
  if (pathname.startsWith("/forms/")) return NextResponse.next();
  if (pathname.startsWith("/incident/")) return NextResponse.next();
  if (pathname.startsWith("/ops/")) return NextResponse.next();
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return session ? NextResponse.redirect(new URL(home(session.role), request.url)) : NextResponse.next();
  }
  if (!session) {
    if (pathname === "/") return NextResponse.next();
    if (protectedApi(pathname)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (BRANCH_REVIEWS.test(pathname)) return NextResponse.next();
  if (STAFF_DISCUSSION.some((p) => pathname.startsWith(p))) {
    if (session.role !== "hr" && session.role !== "branch_manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.next();
  }
  for (const rule of ROUTE_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      if (!rule.roles.includes(session.role as never)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.next();
    }
  }
  if (PAGE_ROLES.some(([prefix]) => pathname.startsWith(prefix)) && !pageOk(session.role, pathname)) {
    return NextResponse.redirect(new URL(home(session.role), request.url));
  }
  if (pathname === "/") return NextResponse.redirect(new URL(home(session.role), request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"] };
