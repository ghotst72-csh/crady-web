"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

const T = {
  reply: { en: "Reply", ko: "답글" },
  placeholder: { en: "Write a reply…", ko: "답글을 입력하세요…" },
  post: { en: "Post", ko: "게시" },
  posting: { en: "Posting…", ko: "게시 중…" },
  cancel: { en: "Cancel", ko: "취소" },
  error: { en: "Couldn't post that. Try again.", ko: "게시하지 못했습니다. 다시 시도해주세요." },
} as const;

/** Creates a reply Activity item (source: "investor", type: "reply",
 * parent_id set) — one reply level only, so this is the single composer
 * for a top-level item's whole thread, not per-reply. */
export function CommentComposer({
  ticker,
  parentId,
  lang = "en",
}: {
  ticker: string;
  parentId: string;
  lang?: "en" | "ko";
}) {
  const { session, openAuthModal } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => (session ? setOpen(true) : openAuthModal())}
        className="text-xs font-semibold text-[var(--gray-500)] hover:text-black transition-colors"
      >
        {T.reply[lang]}
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || body.trim().length === 0) return;
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: insertError } = await supabase.from("activity_items").insert({
      ticker,
      source: "investor",
      type: "reply",
      parent_id: parentId,
      user_id: session.user.id,
      body: body.trim(),
    });
    setSubmitting(false);
    if (insertError) {
      setError(T.error[lang]);
      return;
    }
    setBody("");
    setOpen(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={T.placeholder[lang]}
        maxLength={2000}
        rows={2}
        autoFocus
        className="w-full rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-3 py-2 text-sm focus:bg-white focus:border-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]"
      />
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || body.trim().length === 0}
          className="rounded-full bg-black text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-40 transition-opacity"
        >
          {submitting ? T.posting[lang] : T.post[lang]}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[var(--gray-500)] hover:text-black transition-colors"
        >
          {T.cancel[lang]}
        </button>
      </div>
    </form>
  );
}
