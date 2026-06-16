import { NextResponse } from "next/server";

import { listReviewsNeedingReply, submitExplanation } from "@/lib/branch/review-explanations";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const payload = await listReviewsNeedingReply(auth.session.branch_id);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[GET /api/branch/reviews/explanations]", e);
    return NextResponse.json({ error: "Could not load reviews" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  let body: { signature?: string; authorName?: string; rating?: number; text?: string; explanation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const signature = body.signature?.trim();
  const authorName = body.authorName?.trim();
  const text = body.text?.trim();
  const explanation = body.explanation?.trim();
  const rating = Number(body.rating);

  if (!signature || !authorName || !text || !explanation || !Number.isFinite(rating)) {
    return NextResponse.json({ error: "signature, authorName, rating, text and explanation are required" }, { status: 400 });
  }

  try {
    await submitExplanation(auth.session.branch_id, auth.session.id, {
      signature,
      authorName,
      rating,
      text,
      explanation,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/branch/reviews/explanations]", e);
    return NextResponse.json({ error: "Could not save explanation" }, { status: 500 });
  }
}
