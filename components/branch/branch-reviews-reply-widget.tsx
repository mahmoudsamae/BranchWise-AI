"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import type { ReviewNeedingReply, ReviewsNeedingReplyPayload } from "@/lib/branch/review-explanations";

function ReviewRow({ review, onSubmitted }: { review: ReviewNeedingReply; onSubmitted: (signature: string, explanation: string) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(review.explanation ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/branch/reviews/explanations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: review.signature,
          authorName: review.authorName,
          rating: review.rating,
          text: review.text,
          explanation: text.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      onSubmitted(review.signature, text.trim());
      setOpen(false);
      toast.success("Explanation submitted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-lg border border-[#1f2937] bg-[#0a0f1e]/60 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#9ca3af]">
        <span className="font-medium text-[#e5e7eb]">{review.authorName}</span>
        <span className="flex items-center gap-0.5 text-amber-300">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={i < review.rating ? "size-3 fill-amber-400 text-amber-400" : "size-3 text-[#374151]"} aria-hidden />
          ))}
        </span>
        {review.relativeTime ? <span>{review.relativeTime}</span> : null}
      </div>
      <p className="mt-1.5 text-sm text-[#d1d5db]">{review.text}</p>

      {review.explained ? (
        <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-950/15 px-3 py-2">
          <p className="text-xs font-medium text-emerald-300">Explanation submitted</p>
          <p className="mt-0.5 text-xs text-[#9ca3af]">{review.explanation}</p>
        </div>
      ) : open ? (
        <div className="mt-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Add context for the marketing team's reply…"
            className="w-full rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-[#e5e7eb] placeholder:text-[#6b7280]"
          />
          <div className="mt-1.5 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !text.trim()}
              className="rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4f46e5] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
            NEEDS YOUR EXPLANATION
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4f46e5]"
          >
            Add explanation
          </button>
        </div>
      )}
    </li>
  );
}

export function BranchReviewsReplyWidget({ payload }: { payload: ReviewsNeedingReplyPayload }) {
  const [reviews, setReviews] = useState(payload.reviews);
  const needingReply = reviews.filter((r) => !r.explained).length;

  function handleSubmitted(signature: string, explanation: string) {
    setReviews((prev) => prev.map((r) => (r.signature === signature ? { ...r, explanation, explained: true } : r)));
  }

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#f9fafb]">Reviews needing reply</h2>
        {needingReply > 0 ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300">{needingReply}</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-[#9ca3af]">
        {payload.linked ? "Negative reviews (≤3★) awaiting your explanation. Positives aren't shown here." : "Google Reviews not connected."}
      </p>

      {payload.linked && reviews.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <ReviewRow key={r.signature} review={r} onSubmitted={handleSubmitted} />
          ))}
        </ul>
      ) : payload.linked ? (
        <p className="mt-4 text-sm text-[#6b7280]">No negative reviews right now. Nice work.</p>
      ) : null}

      {payload.linked ? (
        <p className="mt-4 text-sm font-medium text-[#a5b4fc]">
          All reviews · {payload.overallRating.toFixed(1)}★ ({payload.userRatingCount})
          {payload.googleMapsUrl ? (
            <a href={payload.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#c7d2fe]">
              {" "}
              →
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
