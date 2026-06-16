import { NextResponse } from "next/server";

import type { SessionPayload } from "@/lib/session";

export function isDemoSession(session: SessionPayload | null | undefined): session is SessionPayload & { demo: true } {
  return session?.demo === true;
}

export function blockDemoMutation(session: SessionPayload | null) {
  if (isDemoSession(session)) {
    return NextResponse.json(
      { error: "Demo-Modus: Änderungen sind deaktiviert. Nur zur Vorschau." },
      { status: 403 },
    );
  }
  return null;
}
