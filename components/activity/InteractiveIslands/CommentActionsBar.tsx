"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { ReportDialog } from "./ReportDialog";

const T = {
  edit: { en: "Edit", ko: "수정" },
  delete: { en: "Delete", ko: "삭제" },
  report: { en: "Report", ko: "신고" },
  save: { en: "Save", ko: "저장" },
  saving: { en: "Saving…", ko: "저장 중…" },
  cancel: { en: "Cancel", ko: "취소" },
  confirmDelete: { en: "Delete this? This can't be undone.", ko: "삭제하시겠습니까? 되돌릴 수 없습니다." },
  error: { en: "Something went wrong. Try again.", ko: "문제가 발생했습니다. 다시 시도해주세요." },
} as const;

/** Reply/report/edit/delete — nothing more, per the product spec. One
 * table (activity_items) now backs both top-level items and replies, so
 * there's no target-type distinction to make here. Ownership (edit/delete
 * vs. report) is decided client-side against the signed-in session; RLS
 * enforces the same boundary server-side regardless of what this component
 * renders. */
export function CommentActionsBar({
  targetId,
  authorUserId,
  body,
  lang = "en",
}: {
  targetId: string;
  authorUserId: string;
  body: string;
  lang?: "en" | "ko";
}) {
  const { session, openAuthModal } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [reportOpen, setReportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = session?.user.id === authorUserId;

  async function handleSave() {
    if (draft.trim().length === 0) return;
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase
      .from("activity_items")
      .update({ body: draft.trim(), edited_at: new Date().toISOString() })
      .eq("id", targetId);
    setSubmitting(false);
    if (updateError) {
      setError(T.error[lang]);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(T.confirmDelete[lang])) return;
    setSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    const { error: deleteError } = await supabase
      .from("activity_items")
      .update({ status: "deleted" })
      .eq("id", targetId);
    setSubmitting(false);
    if (deleteError) {
      setError(T.error[lang]);
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-3 py-2 text-sm focus:bg-white focus:border-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]"
        />
        {error && <p className="text-xs text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="rounded-full bg-black text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-40"
          >
            {submitting ? T.saving[lang] : T.save[lang]}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(body);
            }}
            className="text-xs text-[var(--gray-500)] hover:text-black transition-colors"
          >
            {T.cancel[lang]}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-3">
      {isOwner ? (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-[var(--gray-500)] hover:text-black transition-colors"
          >
            {T.edit[lang]}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="text-xs font-semibold text-[var(--gray-500)] hover:text-red-700 transition-colors"
          >
            {T.delete[lang]}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => (session ? setReportOpen(true) : openAuthModal())}
          className="text-xs font-semibold text-[var(--gray-500)] hover:text-black transition-colors"
        >
          {T.report[lang]}
        </button>
      )}
      {reportOpen && <ReportDialog targetId={targetId} lang={lang} onClose={() => setReportOpen(false)} />}
    </div>
  );
}
