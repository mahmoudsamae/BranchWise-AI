/** GM sidebar paths (Operations Manager mockup). Sub-routes of allowed prefixes stay reachable. */

const GM_ALLOWED_PREFIXES = [

  "/dashboard",

  "/dashboard/branches",

  "/dashboard/projects",

  "/dashboard/reports",

  "/dashboard/bewertungen",

  "/dashboard/team",

  "/dashboard/account",

] as const;



/** Exact paths removed from nav — redirect to dashboard home. */

const GM_LEGACY_EXACT = new Set([

  "/dashboard/analytics",

  "/dashboard/ki-chat",

  "/dashboard/fruhstuck",

  "/dashboard/exports",

  "/dashboard/communication",

  "/dashboard/schedules",

  "/dashboard/report-builder",

]);



function matchesAllowedPrefix(pathname: string, prefixes: readonly string[]): boolean {

  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

}



/** Redirect legacy GM URLs not in the simplified menu. Returns target or null. */

export function gmDashboardLegacyRedirect(pathname: string): string | null {

  if (!pathname.startsWith("/dashboard")) return null;

  if (GM_LEGACY_EXACT.has(pathname)) return "/dashboard";

  if (matchesAllowedPrefix(pathname, GM_ALLOWED_PREFIXES)) return null;

  return "/dashboard";

}

