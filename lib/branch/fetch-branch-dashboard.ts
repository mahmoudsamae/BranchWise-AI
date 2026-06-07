import { cookies, headers } from "next/headers";

import type { BranchReviewsSummary } from "@/lib/branch/branch-reviews-summary";
import type { SubmissionHistoryPoint } from "@/lib/branch/submission-history";

async function branchApiBaseUrl(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function fetchBranchApi<T>(path: string): Promise<T | null> {
  try {
    const base = await branchApiBaseUrl();
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const res = await fetch(`${base}${path}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchBranchSubmissionHistory(): Promise<SubmissionHistoryPoint[]> {
  const data = await fetchBranchApi<{ history?: SubmissionHistoryPoint[] }>("/api/branch/analytics");
  return data?.history ?? [];
}

export async function fetchBranchReviewsSummary(): Promise<BranchReviewsSummary> {
  const data = await fetchBranchApi<BranchReviewsSummary>("/api/branch/reviews");
  return data ?? { linked: false };
}
