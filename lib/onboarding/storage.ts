import { createServiceRoleClient } from "@/lib/supabase";

export const ONBOARDING_BUCKET = "onboarding-files";

export const MAX_ONBOARDING_FILE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ONBOARDING_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export function buildOnboardingStoragePath(inviteId: string, fieldId: string, fileName: string): string {
  const safe = sanitizeFileName(fileName);
  const stamp = Date.now();
  return `${inviteId}/${fieldId}/${stamp}-${safe}`;
}

export async function createOnboardingSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(ONBOARDING_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
