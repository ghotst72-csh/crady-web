"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { providerLabel } from "@/lib/providers";
import { searchTickers, splitForHighlight, type SearchEntry } from "@/lib/search/searchTickers";

const T = {
  placeholder: { en: "Search ticker or ETF...", ko: "티커 또는 ETF 검색..." },
  ariaLabel: { en: "Search ETFs by ticker or name", ko: "티커 또는 이름으로 ETF 검색" },
  clear: { en: "Clear search", ko: "검색어 지우기" },
  noResults: { en: "No matching ETF", ko: "일치하는 ETF가 없습니다" },
  yield: { en: "Yield", ko: "분배율" },
  score: { en: "Score", ko: "점수" },
} as const;

type Analytics = {
  onOpen?: () => void;
  onQuery?: (query: string, resultCount: number) => void;
  onResultClick?: (ticker: string) => void;
  onNoResults?: (query: string) => void;
};

export function TickerSearch({
  index,
  lang = "en",
  basePath = "",
  className = "",
  inputClassName = "",
  accentClassName = "text-[var(--crady-accent)]",
  autoFocus = false,
  onNavigate,
  analytics,
}: {
  index: SearchEntry[];
  lang?: "en" | "ko";
  basePath?: string;
  className?: string;
  /** Extra classes merged onto the `<input>` itself — lets a caller (e.g.
   * a larger hero variant) resize the field without needing a second
   * implementation. */
  inputClassName?: string;
  /** Overrides the two internal accent spots (match-highlight, yield
   * figure) — both default to the sitewide `--crady-accent` token. A
   * caller embedding this inside an all-blue section can pass a Tailwind
   * text color class here instead, without changing the shared token or
   * any other caller's appearance. */
  accentClassName?: string;
  autoFocus?: boolean;
  /** Called after a result is chosen (e.g. to close a mobile sheet). */
  onNavigate?: () => void;
  analytics?: Analytics;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const openedRef = useRef(false);

  const results = useMemo(() => searchTickers(index, query, 8), [index, query]);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  function go(ticker: string) {
    analytics?.onResultClick?.(ticker);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    onNavigate?.();
    router.push(`${basePath}/${ticker.toLowerCase()}`);
  }

  function handleFocus() {
    setOpen(true);
    if (!openedRef.current) {
      openedRef.current = true;
      analytics?.onOpen?.();
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    setOpen(true);
    setActiveIndex(-1);
    const r = searchTickers(index, value, 8);
    analytics?.onQuery?.(value, r.length);
    if (value.trim() && r.length === 0) analytics?.onNoResults?.(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => (results.length === 0 ? -1 : Math.min(i + 1, results.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? -1 : Math.max(i - 1, 0)));
    } else if (e.key === "Enter") {
      // Defaults to the top result when nothing's been explicitly
      // arrow-navigated yet — the common "type and hit enter" pattern
      // (Google, GitHub's command palette, etc.), not a hidden requirement
      // to arrow-down first before Enter does anything.
      const target = activeIndex >= 0 ? results[activeIndex] : results[0];
      if (target) {
        e.preventDefault();
        go(target.ticker);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    }
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          aria-label={T.ariaLabel[lang]}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onFocus={handleFocus}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={T.placeholder[lang]}
          className={`w-full pl-8 pr-8 py-2 text-sm rounded-full border border-[var(--gray-200)] bg-[var(--gray-50)] placeholder:text-[var(--gray-400)] outline-none transition-colors focus:bg-white focus:border-black focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)] ${inputClassName}`}
        />
        {query && (
          <button
            type="button"
            aria-label={T.clear[lang]}
            onClick={() => {
              setQuery("");
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-[var(--gray-400)] hover:text-black hover:bg-[var(--gray-100)]"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={T.ariaLabel[lang]}
          className="absolute left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-xl border border-[var(--gray-200)] bg-white py-1.5 z-50"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--gray-400)]">
              {T.noResults[lang]}
            </div>
          ) : (
            results.map((r, i) => {
              const tickerParts = splitForHighlight(r.ticker, query);
              const active = i === activeIndex;
              return (
                <button
                  key={r.ticker}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={active}
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => go(r.ticker)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors ${
                    active ? "bg-[var(--gray-100)]" : "hover:bg-[var(--gray-50)]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="font-bold text-sm">
                        {tickerParts.match ? (
                          <>
                            {tickerParts.before}
                            <span className={accentClassName}>{tickerParts.match}</span>
                            {tickerParts.after}
                          </>
                        ) : (
                          r.ticker
                        )}
                      </span>
                      {r.name && (
                        <span className="text-xs text-[var(--gray-500)] truncate">{r.name}</span>
                      )}
                    </span>
                    <span className="block text-[11px] text-[var(--gray-400)] mt-0.5">
                      {providerLabel(r.provider_id)}
                    </span>
                  </span>
                  {(r.annualYieldPct != null || r.cradyScore != null) && (
                    <span className="shrink-0 text-right text-[11px] text-[var(--gray-500)]">
                      {r.annualYieldPct != null && (
                        <span className={`block font-semibold ${accentClassName}`}>
                          {r.annualYieldPct.toFixed(1)}%
                        </span>
                      )}
                      {r.cradyScore != null && (
                        <span className="block">
                          {T.score[lang]} {r.cradyScore.toFixed(0)}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4l16 16M20 4L4 20"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
