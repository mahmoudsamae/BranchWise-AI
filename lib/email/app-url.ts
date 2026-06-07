/** Resolve the public app origin for links in emails, onboarding invites, etc. */
export function appBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

/** Prefer env, then the incoming HTTP request (correct for local dev without NEXT_PUBLIC_APP_URL). */
export function appBaseUrlFromRequest(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return appBaseUrl();
}

export function onboardingInviteUrl(token: string, request?: Request): string {
  const base = request ? appBaseUrlFromRequest(request) : appBaseUrl();
  return `${base}/onboarding/${token}`;
}
