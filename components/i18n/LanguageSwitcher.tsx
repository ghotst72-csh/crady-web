"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getLocaleTargetPath } from "@/lib/i18n/localePath";
import { setStoredLanguagePreference } from "@/lib/i18n/preference";

const LABEL: Record<"en" | "ko", string> = { en: "EN", ko: "한국어" };

/** Desktop header dropdown — "🌐 EN ▾" / "🌐 한국어 ▾". Navigates via a real
 * document load (window.location.href, not router.push): the target page
 * lives under a DIFFERENT root layout (app/(en) vs app/ko — see the
 * International SEO report's "multiple root layouts" architecture), and a
 * plain full navigation is the simplest way to guarantee the new root's
 * <html lang>, JSON-LD, etc. render correctly with zero ambiguity about
 * how Next's client router handles a cross-root transition. */
export function LanguageSwitcher({
  lang,
  compact = false,
}: {
  lang: "en" | "ko";
  /** Icon-only, no "EN"/"한국어" text label — the mobile header trigger
   * (Part 7), where horizontal space is scarce. Same dropdown menu either
   * way, just a smaller trigger. */
  compact?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(target: "en" | "ko") {
    setStoredLanguagePreference(target);
    setOpen(false);
    if (target === lang) return;
    window.location.href = getLocaleTargetPath(pathname, target);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? "Change language" : undefined}
        onClick={() => setOpen((o) => !o)}
        className={
          compact
            ? "w-9 h-9 flex items-center justify-center rounded-full text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors"
            : "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs sm:text-sm text-[var(--gray-600)] hover:text-black hover:bg-[var(--gray-100)] transition-colors"
        }
      >
        <GlobeIcon />
        {!compact && (
          <>
            <span className="font-medium">{LABEL[lang]}</span>
            <span className="text-[var(--gray-400)]" aria-hidden>
              ▾
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-36 rounded-xl border border-[var(--gray-200)] bg-white py-1 shadow-sm z-50"
        >
          <MenuItem label="English" active={lang === "en"} onClick={() => choose("en")} />
          <MenuItem label="한국어" active={lang === "ko"} onClick={() => choose("ko")} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-[var(--gray-50)] transition-colors"
    >
      <span className="w-4 text-[var(--crady-accent)]">{active ? "✓" : ""}</span>
      {label}
    </button>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9s1.3-6.5 3.8-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
