"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const T = {
  heading: { en: "Choose a display name", ko: "표시 이름을 설정하세요" },
  body: {
    en: "This is what other investors will see next to your questions, discussion posts, and comments — never your email.",
    ko: "질문, 토론 게시글, 댓글에 다른 투자자에게 표시될 이름입니다 — 이메일은 절대 노출되지 않습니다.",
  },
  placeholder: { en: "e.g. LongTermHolder", ko: "예: 장기투자자" },
  submit: { en: "Continue", ko: "계속" },
  submitting: { en: "Saving…", ko: "저장 중…" },
} as const;

const INPUT_CLASS =
  "w-full rounded-full border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-2.5 text-sm focus:bg-white focus:border-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]";

/** Shown once, inside AuthModal, right after a first-ever sign-in — the
 * `activity_profiles` row is what lets a post/comment/vote show any public
 * identity at all (raw auth.users email must never be exposed to
 * anon/authenticated), so this step isn't skippable. */
export function DisplayNamePrompt({
  userId,
  lang = "en",
  onDone,
}: {
  userId: string;
  lang?: "en" | "ko";
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError(lang === "ko" ? "1~40자로 입력해주세요." : "Enter 1–40 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: dbError } = await supabase
      .from("activity_profiles")
      .insert({ user_id: userId, display_name: trimmed });
    setSubmitting(false);
    if (dbError) {
      setError(lang === "ko" ? "저장하지 못했습니다. 다시 시도해주세요." : "Couldn't save that. Try again.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-base font-bold">{T.heading[lang]}</h2>
      <p className="text-sm text-[var(--gray-600)]">{T.body[lang]}</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={T.placeholder[lang]}
        maxLength={40}
        autoFocus
        className={INPUT_CLASS}
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={submitting || name.trim().length === 0}
        className="w-full rounded-full bg-black text-white text-sm font-semibold py-2.5 disabled:opacity-40 transition-opacity"
      >
        {submitting ? T.submitting[lang] : T.submit[lang]}
      </button>
    </form>
  );
}
