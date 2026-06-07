import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export function parseBody<T>(
  schema: ZodType<T>,
  data: unknown,
):
  | { ok: true; data: T }
  | { ok: false; response: ReturnType<typeof NextResponse.json> } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((e) => e.message).join(", ");
    return { ok: false, response: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { ok: true, data: result.data };
}
