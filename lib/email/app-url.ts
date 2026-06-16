function isLocalHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function isPrivateLanHost(host: string): boolean {
  const h = host.split(":")[0] ?? "";
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)
  );
}

function protoForHost(host: string, forwardedProto: string | null): string {
  if (isLocalHost(host) || isPrivateLanHost(host)) return "http";
  return forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
}

/** Resolve the public app origin for links in emails, onboarding invites, etc. */
export function appBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) {
    try {
      const u = new URL(envUrl);
      if (isLocalHost(u.host)) return `http://${u.host}`;
    } catch {
      /* ignore */
    }
    return envUrl;
  }

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}

/** Prefer env, then the incoming HTTP request (correct for local dev without NEXT_PUBLIC_APP_URL). */
export function appBaseUrlFromRequest(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) {
    try {
      const u = new URL(envUrl);
      if (!isLocalHost(u.host) && !isPrivateLanHost(u.host)) return envUrl;
    } catch {
      return envUrl;
    }
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = protoForHost(host, request.headers.get("x-forwarded-proto"));
    return `${proto}://${host}`;
  }

  return appBaseUrl();
}

export function publicOpsUrl(token: string, request?: Request): string {
  const base = request ? appBaseUrlFromRequest(request) : appBaseUrl();
  return `${base}/ops/${token}`;
}

export function onboardingInviteUrl(token: string, request?: Request): string {
  const base = request ? appBaseUrlFromRequest(request) : appBaseUrl();
  return `${base}/onboarding/${token}`;
}
