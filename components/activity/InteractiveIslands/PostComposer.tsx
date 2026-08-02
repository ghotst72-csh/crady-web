"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

const T = {
  question: { en: "Question", ko: "질문" },
  discussion: { en: "Discussion", ko: "토론" },
  titlePlaceholder: { en: "e.g. Will TSLY reduce its dividend?", ko: "예: TSLY 배당이 줄어들까요?" },
  bodyPlaceholder: {
    en: "Share your question or start a discussion about this ETF…",
    ko: "이 ETF에 대한 질문이나 토론을 시작해보세요…",
  },
  post: { en: "Post", ko: "게시" },
  posting: { en: "Posting…", ko: "게시 중…" },
  signInToPost: { en: "Sign in to post", ko: "로그인 후 게시" },
  error: { en: "Couldn't post that. Try again.", ko: "게시하지 못했습니다. 다시 시도해주세요." },
} as const;

const INPUT_CLASS =
  "w-full rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-3.5 py-2.5 text-sm focus:bg-white focus:border-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]";

/** Creates a new top-level Activity item (source: "investor", type:
 * "question" | "discussion", parent_id: null). Replies are a separate
 * composer (CommentComposer) since they're just another Activity item with
 * parent_id set — same table, same RLS, different composer UX. */
export function PostComposer({ ticker, lang = "en" }: { ticker: string; lang?: "en" | "ko" }) {
  const { session, openAuthModal } = useAuth();
  const router = useRouter();
  const [kind, setKind] = useState<"question" | "discussion">("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) {
      openAuthModal();
      return;
    }
    if (body.trim().length === 0 || (kind === "question" && title.trim().length === 0)) return;

    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: insertError } = await supabase.from("activity_items").insert({
      ticker,
      source: "investor",
      type: kind,
      user_id: session.user.id,
      title: kind === "question" ? title.trim() : null,
      body: body.trim(),
    });
    setSubmitting(false);
    if (insertError) {
      setError(T.error[lang]);
      return;
    }
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--gray-200)] rounded-xl p-4 space-y-3">
      <div className="flex gap-1.5">
        {(["discussion", "question"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              kind === k
                ? "bg-black border-black text-white"
                : "border-[var(--gray-200)] text-[var(--gray-600)] hover:border-black hover:text-black"
            }`}
          >
            {T[k][lang]}
          </button>
        ))}
      </div>
      {kind === "question" && (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={T.titlePlaceholder[lang]}
          maxLength={200}
          className={INPUT_CLASS}
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={T.bodyPlaceholder[lang]}
        maxLength={4000}
        rows={3}
        className={INPUT_CLASS}
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-black text-white text-sm font-semibold px-4 py-2 disabled:opacity-40 transition-opacity"
      >
        {!session ? T.signInToPost[lang] : submitting ? T.posting[lang] : T.post[lang]}
      </button>
    </form>
  );
}
