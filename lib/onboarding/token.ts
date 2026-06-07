import { randomBytes } from "crypto";

export function generateOnboardingToken(): string {
  return randomBytes(32).toString("hex");
}

export function onboardingInviteExpiry(days = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
