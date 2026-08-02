"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

const T = {
  bull: { en: "Bull", ko: "상승" },
  bear: { en: "Bear", ko: "하락" },
  neutral: { en: "Neutral", ko: "중립" },
} as const;

type Vote = "bull" | "bear" | "neutral";

/** The actual tap control inside EtfActivityStream's stat strip — the
 * strip's percentages themselves are server-rendered from real aggregates;
 * this island only handles casting/changing one's own vote. Auth-gated:
 * signed out, a tap opens AuthModal instead of writing (RLS backs this up
 * regardless). */
export function VoteWidget({ ticker, lang = "en" }: { ticker: string; lang?: "en" | "ko" }) {
  const { session, openAuthModal } = useAuth();
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMyVote() {
      if (!session) {
        if (!cancelled) setMyVote(null);
        return;
      }
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from("activity_ticker_votes")
        .select("vote")
        .eq("ticker", ticker)
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!cancelled) setMyVote((data?.vote as Vote) ?? null);
    }

    loadMyVote();
    return () => {
      cancelled = true;
    };
  }, [session, ticker]);

  async function cast(vote: Vote) {
    if (!session) {
      openAuthModal();
      return;
    }
    setSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("activity_ticker_votes")
      .upsert({ ticker, user_id: session.user.id, vote, updated_at: new Date().toISOString() }, { onConflict: "ticker,user_id" });
    setSubmitting(false);
    if (!error) setMyVote(vote);
  }

  return (
    <div className="flex gap-1.5">
      {(["bull", "bear", "neutral"] as const).map((vote) => (
        <button
          key={vote}
          type="button"
          disabled={submitting}
          onClick={() => cast(vote)}
          aria-pressed={myVote === vote}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors disabled:opacity-50 ${
            myVote === vote
              ? vote === "bull"
                ? "bg-emerald-700 border-emerald-700 text-white"
                : vote === "bear"
                  ? "bg-red-700 border-red-700 text-white"
                  : "bg-black border-black text-white"
              : "border-[var(--gray-200)] text-[var(--gray-600)] hover:border-black hover:text-black"
          }`}
        >
          {T[vote][lang]}
        </button>
      ))}
    </div>
  );
}
