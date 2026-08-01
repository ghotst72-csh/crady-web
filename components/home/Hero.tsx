"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { providerLabel, type EtfSnapshot } from "@/lib/data";

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

const T = {
  eyebrowLead: {
    en: "TODAY'S HIGHEST ANNUALIZED DISTRIBUTION",
    ko: "오늘의 최고 연환산 분배율",
  },
  eyebrowRank: {
    en: (rank: number) => `ANNUALIZED DISTRIBUTION — RANK #${rank}`,
    ko: (rank: number) => `연환산 분배율 — ${rank}위`,
  },
  updated: { en: "Updated", ko: "업데이트" },
  risk: { en: "Risk", ko: "리스크" },
  cradyScore: { en: "CRADY Score", ko: "CRADY 점수" },
  viewEtf: { en: "View ETF →", ko: "ETF 보기 →" },
  prev: { en: "Previous", ko: "이전" },
  next: { en: "Next", ko: "다음" },
  disclaimerToggle: { en: "ⓘ Investment Risks", ko: "ⓘ 투자 위험 고지" },
  disclaimer: {
    en: "High distribution yields carry a risk of principal loss and reduced future payments, and are not guaranteed. Distributions may include return of capital.",
    ko: "높은 분배율은 원금 손실 및 분배금 감소 위험을 포함하며 수익을 보장하지 않습니다. 분배금에는 자본 반환(ROC)이 포함될 수 있습니다.",
  },
  top10: { en: "TOP 10", ko: "TOP 10" },
  todaysLeader: { en: "Today's Leader", ko: "오늘의 1위" },
  avgYield: { en: "Average Yield", ko: "평균 분배율" },
  highestGrowth: { en: "Highest Growth", ko: "최고 상승" },
  na: "—",
  highlightsHeading: { en: "Today's Dividend Highlights", ko: "오늘의 배당 하이라이트" },
  payingThisWeek: { en: "Paying This Week", ko: "이번 주 지급 예정" },
  nextExDate: { en: "Next Ex-Date", ko: "다음 배당락일" },
  highestYieldToday: { en: "Highest Yield Today", ko: "오늘의 최고 분배율" },
  cradyTopPick: { en: "CRADY Top Pick", ko: "CRADY 추천 ETF" },
} as const;

// Barely-there provider tint behind the Hero — Stripe-level subtle, never a
// branded neon glow. Reused verbatim from the old carousel's palette.
const PROVIDER_GLOW: Record<string, string> = {
  yieldmax: "radial-gradient(60% 100% at 15% 15%, rgba(245,158,11,0.07), transparent 70%)",
  roundhill: "radial-gradient(60% 100% at 15% 15%, rgba(59,130,246,0.07), transparent 70%)",
  defiance: "radial-gradient(60% 100% at 15% 15%, rgba(34,197,94,0.07), transparent 70%)",
};

const NUMBER_TRANSITION_MS = 450;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing the real OS preference from a browser-only API after mount, correcting the SSR-safe `false` default
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Animates from whatever it last showed to a new target — never a hard cut. */
function useAnimatedNumber(target: number, durationMs = NUMBER_TRANSITION_MS) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    const effectiveDuration = prefersReducedMotion() ? 0 : durationMs;
    const start = performance.now();
    function tick(now: number) {
      const progress = effectiveDuration <= 0 ? 1 : Math.min((now - start) / effectiveDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Hand-rolled instead of Intl.DateTimeFormat — the original carousel
// documented a REAL bug here: Intl.DateTimeFormat("ko-KR", {timeZone:
// "Asia/Seoul"}) renders different text on Vercel's Node ICU vs. a
// browser's, which forced this to be a client-only, post-mount value
// (fine for a value with no page-load cost, but on a hero rendered eagerly
// it meant the "Updated" text popped in after hydration and shifted
// everything below it — a real, measured CLS regression). A hand-rolled
// formatter has no locale data to disagree about, so it can render
// synchronously on the server and match on the client with zero shift.
function formatUpdatedAt(iso: string | null, lang: "en" | "ko"): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const month = kst.getUTCMonth();
  const day = kst.getUTCDate();
  return lang === "ko" ? `${month + 1}월 ${day}일` : `${MONTH_SHORT_EN[month]} ${day}`;
}

function monthLabel(dateStr: string | null, lang: "en" | "ko"): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getMonth();
  const year = d.getFullYear();
  return lang === "ko" ? `${year}년 ${month + 1}월` : `${MONTH_LONG_EN[month]} ${year}`;
}

/** "Why is this ETF interesting?" — a short, rule-based summary assembled
 * from real fields already on the snapshot (rank, next prediction date,
 * risk level). Deterministic template logic, the same pattern already used
 * by lib/magazine/sections.tsx's aiSummarySection — never an LLM call, so
 * it can never say something the underlying data doesn't support. */
function heroInsight(etf: EtfSnapshot, rank: number, lang: "en" | "ko"): string {
  const parts: string[] = [];

  if (rank === 1) {
    parts.push(
      lang === "ko"
        ? "최근 90일 실지급 기준 연환산 분배율이 추적 중인 전체 ETF 중 가장 높습니다."
        : "Highest annualized distribution among all tracked ETFs, based on its recent 90-day payment run-rate."
    );
  } else {
    parts.push(
      lang === "ko"
        ? `연환산 분배율 기준 추적 중인 ETF 중 ${rank}위입니다.`
        : `Ranks #${rank} by annualized distribution yield among all tracked ETFs.`
    );
  }

  const nextMonth = monthLabel(etf.nextPredictedDate, lang);
  if (nextMonth) {
    parts.push(
      lang === "ko" ? `다음 예상 지급은 ${nextMonth}입니다.` : `Next predicted payment expected in ${nextMonth}.`
    );
  }

  if (etf.riskLevel === "EXTREME" || etf.riskLevel === "RISKY") {
    parts.push(
      lang === "ko"
        ? "커버드콜 전략 특성상 높은 분배율은 상대적으로 큰 하방 위험을 동반합니다."
        : "As a covered-call strategy, this high yield comes with elevated downside risk and may include return of capital."
    );
  } else if (etf.riskLevel === "SAFE" && etf.dividendStabilityScore != null && etf.dividendStabilityScore >= 70) {
    parts.push(
      lang === "ko"
        ? "변동성과 배당 안정성 기준으로 CRADY는 이 ETF를 상대적으로 안정적으로 분류합니다."
        : "CRADY classifies this ETF as relatively stable, based on its volatility and dividend consistency."
    );
  }

  return parts.join(" ");
}

/** The homepage's hero moment — a single ETF, Bloomberg/FT-style, not a
 * coverflow carousel. No autoplay, no drag: the reader (or the TOP 10 panel
 * beside it) explicitly chooses what's shown. Desktop and mobile render the
 * exact same content in the exact same order (Part 14) — only the grid
 * reflows the panel from beside the hero to below it. */
export function HeroSection({
  top10,
  weekCount,
  nextExDividend,
  topPick,
  lang = "en",
  basePath = "",
}: {
  top10: EtfSnapshot[];
  /** ETFs with a payment scheduled this week — homepage Highlights card
   * (Web UX/SEO Phase 2, Part 1). */
  weekCount?: number;
  /** Soonest upcoming ex-dividend date across the whole snapshot, not just
   * top10-by-yield — a different, narrower ranking would misrepresent
   * "next" if the soonest ex-date belongs to a lower-yield ETF. */
  nextExDividend?: { ticker: string; exDate: string } | null;
  /** Highest CRADY Score across the whole snapshot — deliberately a
   * different ranking axis than top10 (sorted by yield), so this card
   * never just repeats the Hero's own headline ETF. */
  topPick?: { ticker: string; cradyScore: number } | null;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const len = top10.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [pulseTick, setPulseTick] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const active = top10[activeIndex];
  const animatedYield = useAnimatedNumber(active?.annualYieldPct ?? 0);
  const animatedScore = useAnimatedNumber(active?.cradyScore ?? 0);

  const goTo = useCallback(
    (i: number) => {
      setActiveIndex(((i % len) + len) % len);
      setPulseTick((t) => t + 1);
    },
    [len]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(activeIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(activeIndex - 1);
    }
  }

  // Touch/swipe navigation — a horizontal drag past the threshold advances
  // the pager, same as the arrow buttons. No coverflow/visual drag-follow
  // (Part 5's chosen direction keeps the static single-ETF Hero); this is
  // purely a gesture alternative to tapping the arrows.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD_PX = 40;
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const end = e.changedTouches[0];
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goTo(activeIndex + 1);
    else goTo(activeIndex - 1);
  }

  if (!active) return null;

  // Panel mini-stats, computed once from the same top10 set the list shows.
  const leader = top10[0];
  const yieldsWithValue = top10.filter((e) => e.annualYieldPct != null);
  const avgYield =
    yieldsWithValue.length > 0
      ? yieldsWithValue.reduce((sum, e) => sum + e.annualYieldPct!, 0) / yieldsWithValue.length
      : null;
  const growthCandidates = top10.filter((e) => e.dividendTrend === "up" && e.dividendTrendPct != null);
  const highestGrowth =
    growthCandidates.length > 0
      ? growthCandidates.reduce((a, b) => (b.dividendTrendPct! > a.dividendTrendPct! ? b : a))
      : null;

  const glow = PROVIDER_GLOW[active.provider_id] ?? "none";
  const updatedAt = formatUpdatedAt(active.calculatedAt, lang);
  const eyebrow = activeIndex === 0 ? T.eyebrowLead[lang] : T.eyebrowRank[lang](activeIndex + 1);

  const highlightItems = [
    top10[0]?.annualYieldPct != null
      ? {
          key: "highest-yield",
          label: T.highestYieldToday[lang],
          value: `${top10[0].annualYieldPct.toFixed(1)}%`,
          sub: top10[0].ticker,
          href: `${basePath}/${top10[0].ticker.toLowerCase()}`,
        }
      : null,
    weekCount != null
      ? {
          key: "week-count",
          label: T.payingThisWeek[lang],
          value: String(weekCount),
          sub: null,
          href: `${basePath}/calendar`,
        }
      : null,
    nextExDividend
      ? {
          key: "next-ex-date",
          label: T.nextExDate[lang],
          value: nextExDividend.exDate,
          sub: nextExDividend.ticker,
          href: `${basePath}/${nextExDividend.ticker.toLowerCase()}`,
        }
      : null,
    topPick
      ? {
          key: "top-pick",
          label: T.cradyTopPick[lang],
          value: topPick.ticker,
          sub: `${T.cradyScore[lang]} ${topPick.cradyScore.toFixed(1)}`,
          href: `${basePath}/${topPick.ticker.toLowerCase()}`,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item != null);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
      {/* Today's Dividend Highlights — text-only glanceable cards at the very
          top of the Hero, so "what's happening today" reads before the
          single-ETF spotlight below it (Web UX/SEO Phase 2, Part 1). */}
      {highlightItems.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-[var(--gray-500)] tracking-wide mb-2">
            {T.highlightsHeading[lang]}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {highlightItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="border border-[var(--gray-200)] rounded-xl px-3 py-2.5 hover:border-black hover:shadow-sm transition-all"
              >
                <div className="text-[10px] text-[var(--gray-500)] uppercase tracking-wide">{item.label}</div>
                <div className="mt-0.5 text-base font-bold tabular-nums truncate">{item.value}</div>
                {item.sub && <div className="text-[11px] text-[var(--gray-500)] truncate">{item.sub}</div>}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_300px] gap-4 xl:gap-5 items-start">
        {/* Hero card */}
        <div
          role="group"
          aria-roledescription={lang === "ko" ? "오늘의 대표 ETF" : "featured ETF"}
          aria-label={lang === "ko" ? "오늘의 대표 ETF" : "Today's featured ETF"}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="relative border border-[var(--gray-200)] rounded-2xl overflow-hidden bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]"
        >
          {/* Subtle financial backdrop — a barely-visible dot grid plus the
              provider tint, never a photo/video/gradient hero. The number
              stays the only thing that draws the eye. */}
          <div
            className="absolute inset-0 pointer-events-none transition-[background] duration-700 ease-out"
            style={{ background: glow }}
            aria-hidden
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.35]"
            style={{
              backgroundImage: "radial-gradient(var(--gray-300) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              maskImage: "linear-gradient(to bottom, black, transparent 85%)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)",
            }}
            aria-hidden
          />

          <div className="relative px-5 sm:px-8 py-7 sm:py-9">
            <div className="text-[11px] sm:text-xs font-bold text-[var(--gray-500)] tracking-wide">
              {eyebrow}
            </div>

            <span
              key={pulseTick}
              className={`mt-2 block text-6xl sm:text-8xl font-black text-[var(--crady-accent)] tabular-nums leading-none ${
                reducedMotion ? "" : "animate-hero-pop"
              }`}
            >
              {animatedYield.toFixed(1)}%
            </span>

            <div key={pulseTick} className={reducedMotion ? "" : "animate-hero-fade"}>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold">{active.ticker}</span>
                {active.riskLevel && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                    {RISK_LABEL[lang][active.riskLevel] ?? active.riskLevel}
                  </span>
                )}
              </div>
              <div className="text-sm text-[var(--gray-500)] mt-0.5">
                {providerLabel(active.provider_id)}
                {active.name ? ` · ${active.name}` : ""}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[var(--gray-600)]">
                {updatedAt && (
                  <span>
                    {T.updated[lang]} <strong className="text-black">{updatedAt}</strong>
                  </span>
                )}
                {active.riskLevel && (
                  <span>
                    {T.risk[lang]}{" "}
                    <strong className="text-black">{RISK_LABEL[lang][active.riskLevel] ?? active.riskLevel}</strong>
                  </span>
                )}
                {active.cradyScore != null && (
                  <span>
                    {T.cradyScore[lang]} <strong className="text-black tabular-nums">{animatedScore.toFixed(1)}</strong>
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm text-[var(--gray-600)] max-w-md leading-relaxed">
                {heroInsight(active, activeIndex + 1, lang)}
              </p>

              <Link
                href={`${basePath}/${active.ticker.toLowerCase()}`}
                className="mt-5 inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-[var(--gray-900)] transition-colors"
              >
                {T.viewEtf[lang]}
              </Link>
            </div>

            {/* Manual pager — no autoplay, no chip row. Previous/Next, a
                position counter, and a dot indicator (swipeable on touch
                devices via onTouchStart/onTouchEnd on the card above). */}
            {len > 1 && (
              <div className="mt-6 flex items-center gap-3 text-xs text-[var(--gray-500)]">
                <button
                  type="button"
                  aria-label={T.prev[lang]}
                  onClick={() => goTo(activeIndex - 1)}
                  className="w-7 h-7 rounded-full border border-[var(--gray-200)] flex items-center justify-center hover:border-black hover:text-black transition-colors"
                >
                  ←
                </button>
                <span className="tabular-nums shrink-0">
                  {activeIndex + 1} / {len}
                </span>
                <button
                  type="button"
                  aria-label={T.next[lang]}
                  onClick={() => goTo(activeIndex + 1)}
                  className="w-7 h-7 rounded-full border border-[var(--gray-200)] flex items-center justify-center hover:border-black hover:text-black transition-colors"
                >
                  →
                </button>
                <div className="flex items-center gap-1 ml-1" role="tablist" aria-label={T.top10[lang]}>
                  {/* p-2.5 gives each button a >=24px hit area even though
                      the visible dot inside stays small, and gap-1 on the
                      container keeps adjacent hit areas from touching — a
                      real touch-target accessibility failure the first
                      version of this indicator had (6px targets with zero
                      spacing between them). */}
                  {top10.map((etf, i) => (
                    <button
                      key={etf.ticker}
                      type="button"
                      role="tab"
                      aria-selected={i === activeIndex}
                      aria-label={etf.ticker}
                      onClick={() => goTo(i)}
                      className="p-2.5 flex items-center justify-center"
                    >
                      <span
                        className={`block rounded-full transition-all ${
                          i === activeIndex
                            ? "w-4 h-1.5 bg-black"
                            : "w-1.5 h-1.5 bg-[var(--gray-300)] hover:bg-[var(--gray-400)]"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Companion panel — same content and order on mobile (below) and
            desktop (beside), per Part 14. */}
        <aside className="border border-[var(--gray-200)] rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-[var(--gray-200)] bg-[var(--gray-50)] text-xs font-bold text-[var(--gray-500)] tracking-wide">
            {T.top10[lang]}
          </div>

          {/* Fixed row heights throughout this panel — deliberate, not
              incidental: a font swap or number change reflowing an
              organic-height list is a real, measured CLS source once this
              panel is no longer inside the old carousel's fixed-height box. */}
          <div className="grid grid-cols-3 divide-x divide-[var(--gray-100)] border-b border-[var(--gray-200)] text-center">
            <div className="px-2 py-2.5 h-[54px]">
              <div className="text-sm font-extrabold truncate">{leader.ticker}</div>
              <div className="text-[10px] text-[var(--gray-500)] mt-0.5">{T.todaysLeader[lang]}</div>
            </div>
            <div className="px-2 py-2.5 h-[54px]">
              <div className="text-sm font-extrabold tabular-nums">
                {avgYield != null ? `${avgYield.toFixed(1)}%` : T.na}
              </div>
              <div className="text-[10px] text-[var(--gray-500)] mt-0.5">{T.avgYield[lang]}</div>
            </div>
            <div className="px-2 py-2.5 h-[54px]">
              <div className="text-sm font-extrabold truncate">
                {highestGrowth ? highestGrowth.ticker : T.na}
              </div>
              <div className="text-[10px] text-[var(--gray-500)] mt-0.5">{T.highestGrowth[lang]}</div>
            </div>
          </div>

          <ul>
            {top10.map((etf, i) => (
              <li key={etf.ticker}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === activeIndex}
                  className={`w-full h-10 flex items-center gap-2.5 pl-3.5 pr-4 text-left border-b border-[var(--gray-100)] last:border-0 border-l-2 transition-colors ${
                    i === activeIndex
                      ? "bg-[var(--gray-100)] border-l-black"
                      : "border-l-transparent hover:bg-[var(--gray-50)]"
                  }`}
                >
                  <span className="w-4 text-[10px] text-[var(--gray-500)] font-semibold">{i + 1}</span>
                  <span className="text-sm font-semibold flex-1 min-w-0 truncate">{etf.ticker}</span>
                  <span className="text-sm font-bold text-[#92400e] tabular-nums">
                    {etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : T.na}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Never inside the Hero card — an expandable disclosure underneath
          it instead (Part 4). */}
      <details className="mt-3 group">
        <summary className="cursor-pointer select-none list-none text-xs font-medium text-[var(--gray-500)] hover:text-black inline-flex items-center gap-1">
          {T.disclaimerToggle[lang]}
          <span className="transition-transform group-open:rotate-180">▾</span>
        </summary>
        <p className="mt-1.5 text-xs text-[var(--gray-500)] max-w-2xl">{T.disclaimer[lang]}</p>
      </details>
    </section>
  );
}
