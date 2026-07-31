"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TickerSearch } from "./TickerSearch";
import type { SearchEntry } from "@/lib/search/searchTickers";

const T = {
  openLabel: { en: "Search ETFs", ko: "ETF 검색" },
  closeLabel: { en: "Close search", ko: "검색 닫기" },
} as const;

export function MobileSearch({
  index,
  lang = "en",
  basePath = "",
}: {
  index: SearchEntry[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    // Prevent background scroll while the sheet is open — a mobile
    // keyboard already eats most of the viewport, no reason to also let
    // the page behind it scroll.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={T.openLabel[lang]}
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors"
      >
        <SearchIcon />
      </button>

      {/* Portaled to document.body — this sheet used to render inline
          inside <header>, and <header> has backdrop-blur (a backdrop-filter),
          which per spec makes it the CONTAINING BLOCK for any fixed-position
          descendant. That silently resized "fixed inset-0" here down to
          header's own ~56px height instead of the full viewport, so the
          "full-screen" sheet only ever covered the header strip and every
          page underneath showed through. Portaling to body sidesteps any
          ancestor's stacking/containing-block quirks entirely — the
          standard fix for a modal/sheet in this situation. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[60] bg-white sm:hidden" role="dialog" aria-modal="true">
            <div className="flex items-center gap-2 h-14 px-4 border-b border-[var(--gray-200)]">
              <div className="flex-1">
                <TickerSearch
                  index={index}
                  lang={lang}
                  basePath={basePath}
                  autoFocus
                  onNavigate={() => setOpen(false)}
                />
              </div>
              <button
                type="button"
                aria-label={T.closeLabel[lang]}
                onClick={() => setOpen(false)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4l16 16M20 4L4 20"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
