"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const REASONS = ["spam", "scam_pump_dump", "referral_abuse", "harassment", "other"] as const;
type Reason = (typeof REASONS)[number];

const T = {
  title: { en: "Report content", ko: "신고하기" },
  reasonLabel: { en: "Reason", ko: "사유" },
  reasons: {
    spam: { en: "Spam", ko: "스팸" },
    scam_pump_dump: { en: "Scam / pump-and-dump", ko: "사기 / 시세조작" },
    referral_abuse: { en: "Referral abuse", ko: "추천 링크 남용" },
    harassment: { en: "Harassment", ko: "괴롭힘" },
    other: { en: "Other", ko: "기타" },
  },
  detailPlaceholder: { en: "Additional detail (optional)", ko: "추가 설명 (선택)" },
  submit: { en: "Submit report", ko: "신고 제출" },
  submitting: { en: "Submitting…", ko: "제출 중…" },
  cancel: { en: "Cancel", ko: "취소" },
  submitted: { en: "Thanks — this has been reported.", ko: "신고가 접수되었습니다." },
  error: { en: "Couldn't submit that. Try again.", ko: "제출하지 못했습니다. 다시 시도해주세요." },
} as const;

/** Reuses AuthModal's exact centered-portal pattern rather than inventing a
 * second modal shape. Insert-only against activity_reports — the unique
 * (target_id, reporter_user_id) constraint means a second report from the
 * same account on the same target simply fails silently from the user's
 * perspective (shown as already-submitted). One item table now (no more
 * post/comment split), so there's no target-type to pass. */
export function ReportDialog({
  targetId,
  lang = "en",
  onClose,
}: {
  targetId: string;
  lang?: "en" | "ko";
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState<Reason>("spam");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("activity_reports").insert({
      target_id: targetId,
      reporter_user_id: user.id,
      reason,
      detail: detail.trim() || null,
    });
    setSubmitting(false);
    if (insertError) {
      // Unique-constraint violation (already reported by this account) reads
      // the same as success from the user's point of view.
      if (insertError.code === "23505") {
        setSubmitted(true);
        return;
      }
      setError(T.error[lang]);
      return;
    }
    setSubmitted(true);
    router.refresh();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={T.title[lang]}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-base font-bold mb-4">{T.title[lang]}</h2>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--gray-700)]">{T.submitted[lang]}</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-black text-white text-sm font-semibold py-2.5"
            >
              {T.cancel[lang]}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <span className="text-xs font-semibold text-[var(--gray-600)]">{T.reasonLabel[lang]}</span>
              <div className="mt-1.5 space-y-1.5">
                {REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                    />
                    {T.reasons[r][lang]}
                  </label>
                ))}
              </div>
            </div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={T.detailPlaceholder[lang]}
              maxLength={500}
              rows={2}
              className="w-full rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-3 py-2 text-sm focus:bg-white focus:border-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]"
            />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-black text-white text-sm font-semibold py-2.5 disabled:opacity-40 transition-opacity"
              >
                {submitting ? T.submitting[lang] : T.submit[lang]}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[var(--gray-200)] text-sm font-semibold px-4 py-2.5"
              >
                {T.cancel[lang]}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
