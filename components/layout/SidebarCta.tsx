"use client";

import { Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

const T = {
  heading: { en: "Track smarter.", ko: "더 똑똑하게 추적하세요." },
  body: {
    en: "Build your portfolio and never miss a distribution.",
    ko: "포트폴리오를 만들고 분배금을 놓치지 마세요.",
  },
  cta: { en: "Create Free Account", ko: "무료 계정 만들기" },
} as const;

/** Desktop-sidebar-only CTA (Image 1 shows it beneath the nav list in the
 * persistent sidebar, not in the mobile drawer) — signed-out visitors
 * only, reusing the same auth-modal trigger AuthStatus already uses so
 * there's one sign-up entry point, not two divergent flows. */
export function SidebarCta({ lang = "en" }: { lang?: "en" | "ko" }) {
  const { session, loading, openAuthModal } = useAuth();

  if (loading || session) return null;

  return (
    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <Sparkles size={18} strokeWidth={2} className="text-blue-600" aria-hidden="true" />
      <div className="mt-2 text-sm font-bold text-[var(--gray-900)]">{T.heading[lang]}</div>
      <p className="mt-1 text-xs text-[var(--gray-600)] leading-relaxed">{T.body[lang]}</p>
      <button
        type="button"
        onClick={openAuthModal}
        className="mt-3 w-full px-3 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        {T.cta[lang]}
      </button>
    </div>
  );
}
