"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getLocaleTargetPath, browserPrefersKorean } from "@/lib/i18n/localePath";
import {
  getStoredLanguagePreference,
  setStoredLanguagePreference,
  hasSeenLanguagePrompt,
  markLanguagePromptSeen,
} from "@/lib/i18n/preference";

// This card only ever renders on the English tree (recommending Korean to
// a browser whose language list says Korean) — there's no symmetric case
// where a Korean page would recommend English, so these strings are
// English-only rather than a bilingual table with an unused half.
const HEADING = "🌐 Korean version available";
const BODY = "Would you like to view CRADY in Korean?";
const SWITCH_CTA = "한국어 보기";
const STAY_CTA = "Continue in English";
const CLOSE_LABEL = "Dismiss";

/** Everything here is intentionally client-only and runs strictly after
 * mount — it never reads a header, cookie, or any other signal on the
 * server, and the server-rendered HTML (what Googlebot's initial fetch
 * sees) is completely unaffected by any of this. The auto-redirect below
 * only ever fires from an explicit prior choice stored in this browser's
 * localStorage; a fresh crawl or first-time visitor has none, so nothing
 * here can redirect a crawler or infer a redirect from Accept-Language —
 * see the CRADY International UX Phase 2 report for the full reasoning. */
export function LanguagePreferenceManager({ lang }: { lang: "en" | "ko" }) {
  const pathname = usePathname();
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    const stored = getStoredLanguagePreference();

    // An explicit prior choice that doesn't match where we are now — the
    // ONLY condition that ever triggers an automatic navigation here.
    if (stored && stored !== lang) {
      const target = getLocaleTargetPath(pathname, stored);
      // Pages with no Korean equivalent (Magazine, legal pages — see
      // NO_KO_EQUIVALENT in localePath.ts) fall back to the Korean home
      // page rather than a broken link. That fallback is a reasonable
      // outcome for an EXPLICIT switch (the switcher, footer link, or
      // recommendation card), but firing it passively on every mount
      // would hijack normal in-app navigation: clicking a Magazine link
      // from a /ko page lands on the English Magazine article, and this
      // effect would then silently bounce the user straight to /ko home
      // instead of leaving them on the page they just navigated to. Only
      // auto-redirect here when it actually preserves the current page.
      const isFallbackToHome = target === "/ko" && pathname !== "/" && pathname !== "/ko";
      if (!isFallbackToHome) {
        window.location.href = target;
      }
      return;
    }

    // Recommendation card: only ever on the English tree (the Korean tree
    // has no reason to recommend itself), only when there's no stored
    // preference yet, only once (hasSeenLanguagePrompt), and only when the
    // browser's language list actually indicates Korean.
    if (
      lang === "en" &&
      !stored &&
      !hasSeenLanguagePrompt() &&
      browserPrefersKorean(typeof navigator !== "undefined" ? navigator : undefined)
    ) {
      // Deliberately deferred to an effect, not computed during render: the
      // server has no navigator/localStorage, so computing this during
      // render would either mismatch SSR output or require a hydration
      // hack. Reading it once after mount is the sync-with-client-signal
      // case the set-state-in-effect rule intends to allow.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowCard(true);
    }
  }, [pathname, lang]);

  function chooseKorean() {
    setStoredLanguagePreference("ko");
    markLanguagePromptSeen();
    window.location.href = getLocaleTargetPath(pathname, "ko");
  }

  function stayEnglish() {
    setStoredLanguagePreference("en");
    markLanguagePromptSeen();
    setShowCard(false);
  }

  function dismiss() {
    // A bare close is "not now," not "I choose English" — no preference
    // is stored, only that the prompt's been seen (Part 6: store ONLY an
    // explicit choice).
    markLanguagePromptSeen();
    setShowCard(false);
  }

  if (!showCard) return null;

  return (
    <div
      role="dialog"
      aria-label={HEADING}
      className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-xs rounded-2xl border border-[var(--gray-200)] bg-white p-4 shadow-lg animate-hero-fade"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold">{HEADING}</div>
        <button
          type="button"
          aria-label={CLOSE_LABEL}
          onClick={dismiss}
          className="shrink-0 -mt-1 -mr-1 w-6 h-6 flex items-center justify-center rounded-full text-[var(--gray-400)] hover:text-black hover:bg-[var(--gray-100)]"
        >
          ×
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--gray-600)]">{BODY}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={chooseKorean}
          className="flex-1 px-3 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-[var(--gray-900)] transition-colors"
        >
          {SWITCH_CTA}
        </button>
        <button
          type="button"
          onClick={stayEnglish}
          className="flex-1 px-3 py-2 border border-[var(--gray-200)] rounded-lg text-sm font-medium text-[var(--gray-600)] hover:border-black hover:text-black transition-colors"
        >
          {STAY_CTA}
        </button>
      </div>
    </div>
  );
}
