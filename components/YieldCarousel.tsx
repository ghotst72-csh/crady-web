"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { providerLabel, type EtfSnapshot } from "@/lib/data";

const RISK_LABEL: Record<string, string> = {
  SAFE: "안정",
  NORMAL: "보통",
  RISKY: "위험",
  EXTREME: "고위험",
};

// Barely-there provider tint behind the Hero — Stripe-level subtle, never a
// branded neon glow. Falls back to no tint for unknown provider ids.
const PROVIDER_GLOW: Record<string, string> = {
  yieldmax: "radial-gradient(60% 100% at 15% 20%, rgba(245,158,11,0.07), transparent 70%)",
  roundhill: "radial-gradient(60% 100% at 15% 20%, rgba(59,130,246,0.07), transparent 70%)",
  defiance: "radial-gradient(60% 100% at 15% 20%, rgba(34,197,94,0.07), transparent 70%)",
};

const AUTOPLAY_TICK_MS = 4500;
const PAUSE_AFTER_INTERACTION_MS = 6000;
const NUMBER_TRANSITION_MS = 450;
const DRAG_COMMIT_THRESHOLD_PX = 60;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatUpdatedAt(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** Shortest signed distance on a circular index space of length `len`. */
function circularDelta(i: number, active: number, len: number): number {
  let d = i - active;
  if (d > len / 2) d -= len;
  if (d < -len / 2) d += len;
  return d;
}

/** Animates from whatever it last showed to a new target — never a hard cut. */
function useAnimatedNumber(target: number, durationMs = NUMBER_TRANSITION_MS) {
  // Always start from the SSR-safe default (0) — reading matchMedia in a
  // lazy initializer runs during client hydration too and can render text
  // that doesn't match the server HTML (React error #418). The real
  // reduced-motion jump happens inside the effect below instead, which only
  // ever runs client-side, after hydration is already reconciled.
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    // Under reduced motion, durationMs collapses to 0 so the very first RAF
    // tick already has progress=1 — an instant jump via the same code path,
    // no separate synchronous setState branch needed.
    const effectiveDuration = prefersReducedMotion() ? 0 : durationMs;
    const start = performance.now();
    function tick(now: number) {
      const progress =
        effectiveDuration <= 0 ? 1 : Math.min((now - start) / effectiveDuration, 1);
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

function usePrefersReducedMotion() {
  // Same SSR-hydration reasoning as useIsMobile — default false to match the
  // server, correct it client-side after mount.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing the real OS preference from a browser-only API after mount, correcting the SSR-safe `false` default (matchMedia doesn't exist on the server)
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useIsMobile() {
  // Same SSR-hydration concern as useAnimatedNumber above: the initial value
  // must match what the server rendered (it has no window, so it can't know
  // viewport width) — real detection happens client-side, post-hydration.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: same post-mount browser-API sync as usePrefersReducedMotion above
    setIsMobile(mq.matches);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export function YieldCarousel({ top10 }: { top10: EtfSnapshot[] }) {
  const len = top10.length;
  // Renders a minimal, non-interactive #1 card until this flips true. This
  // guarantees the client's very first render pass (the one hydration
  // compares against the server HTML) is trivially identical on both sides —
  // the full transform/drag/autoplay carousel only ever mounts client-side,
  // after hydration has already reconciled, so it can never be the subject
  // of a hydration diff no matter how server/client environments differ.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: the standard client-only-mount gate, see comment above
    setMounted(true);
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [drag, setDrag] = useState<{ startX: number; deltaX: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [pulseTick, setPulseTick] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const resumeAtRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const indicatorRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const active = top10[activeIndex];
  const animatedYield = useAnimatedNumber(active?.annualYieldPct ?? 0);
  const animatedScore = useAnimatedNumber(active?.cradyScore ?? 0);

  const registerInteraction = useCallback(() => {
    resumeAtRef.current = Date.now() + PAUSE_AFTER_INTERACTION_MS;
  }, []);

  const goTo = useCallback(
    (i: number) => {
      setActiveIndex(((i % len) + len) % len);
      setPulseTick((t) => t + 1);
    },
    [len]
  );
  const next = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  const prev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  // Autoplay — state-driven index advance, never scrollLeft. Paused while
  // hovered/focused/dragging, and held off for a cooldown window after any
  // manual interaction; each new interaction pushes the cooldown forward.
  useEffect(() => {
    if (reducedMotion || len <= 1) return;
    const interval = setInterval(() => {
      if (isHovered || isFocused || drag) return;
      if (Date.now() < resumeAtRef.current) return;
      setActiveIndex((i) => (i + 1) % len);
      setPulseTick((t) => t + 1);
    }, AUTOPLAY_TICK_MS);
    return () => clearInterval(interval);
  }, [reducedMotion, len, isHovered, isFocused, drag]);

  // Keep the active indicator pill in view without a visible scrollbar.
  useEffect(() => {
    indicatorRefs.current.get(activeIndex)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeIndex, reducedMotion]);

  // Hardened against rapid repeated swipes: every handler checks the event's
  // pointerId against the one that actually started the drag, so a stray or
  // overlapping pointer event (fast repeated swipes can fire a new
  // pointerdown before the previous pointerup's state has committed) can
  // never mutate someone else's in-flight gesture. Position itself is
  // re-derived from activeIndex on every render (dist * STEP) — the only
  // way it can appear to "drift" is a stuck non-zero dragOffset, so that
  // value is also hard-clamped as a second line of defense, and cleanup
  // runs on pointerup/cancel/lost-capture alike (three independent signals
  // instead of relying on exactly one).
  function endDrag(pointerId: number) {
    if (activePointerIdRef.current !== pointerId) return;
    activePointerIdRef.current = null;
    setDrag((d) => {
      if (d) {
        if (d.deltaX <= -DRAG_COMMIT_THRESHOLD_PX) next();
        else if (d.deltaX >= DRAG_COMMIT_THRESHOLD_PX) prev();
        registerInteraction();
      }
      return null;
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    registerInteraction();
    activePointerIdRef.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ startX: e.clientX, deltaX: 0 });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (activePointerIdRef.current !== e.pointerId) return;
    const MAX_DRAG_PX = 400;
    setDrag((d) => {
      if (!d) return d;
      const raw = e.clientX - d.startX;
      const clamped = Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, raw));
      return { ...d, deltaX: clamped };
    });
  }
  function onPointerUp(e: React.PointerEvent) {
    endDrag(e.pointerId);
  }
  function onPointerCancel(e: React.PointerEvent) {
    endDrag(e.pointerId);
  }
  function onLostPointerCapture(e: React.PointerEvent) {
    endDrag(e.pointerId);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      registerInteraction();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      registerInteraction();
      prev();
    } else if (e.key === "Home") {
      e.preventDefault();
      registerInteraction();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      registerInteraction();
      goTo(len - 1);
    }
  }

  if (!active) return null;

  const dragOffset = drag?.deltaX ?? 0;
  const STEP = isMobile ? 150 : 240;
  const glow = PROVIDER_GLOW[active.provider_id] ?? "none";
  const updatedAt = formatUpdatedAt(active.calculatedAt);

  if (!mounted) {
    // Root cause found: Intl.DateTimeFormat("ko-KR", {timeZone:"Asia/Seoul"})
    // produces different output between Vercel's Node runtime (different
    // ICU data) and the browser — a real, reproducible environment
    // difference (confirmed by isolation testing directly against the live
    // deployment), not a logic bug. updatedAt is intentionally omitted here
    // and only computed post-mount (see the main render below), where it's
    // a pure client-side value never compared against server HTML.
    const first = top10[0];
    return (
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
        <div className="relative border border-[var(--gray-200)] rounded-2xl overflow-hidden">
          <div className="h-[300px] sm:h-[340px]">
            <CenterCard
              etf={first}
              rank={1}
              animatedYield={first.annualYieldPct ?? 0}
              animatedScore={first.cradyScore ?? 0}
              updatedAt={null}
              pulseKey={0}
              reducedMotion
              onNavigate={() => {}}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl xl:max-w-7xl px-4 sm:px-6 pt-6">
      <div className="xl:grid xl:grid-cols-[1fr_300px] xl:gap-5 xl:items-start">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="연환산 분배율 TOP 10"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="relative border border-[var(--gray-200)] rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]"
      >
        {/* Provider-tinted backdrop — crossfades, deliberately subliminal */}
        <div
          className="absolute inset-0 pointer-events-none transition-[background] duration-700 ease-out"
          style={{ background: glow }}
          aria-hidden
        />

        {/* Draggable stage */}
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onLostPointerCapture}
          style={{ touchAction: "pan-y" }}
          className={`relative h-[300px] sm:h-[340px] select-none ${drag ? "cursor-grabbing" : "cursor-grab"}`}
        >
          {top10.map((etf, i) => {
            const dist = circularDelta(i, activeIndex, len);
            const absDist = Math.abs(dist);
            if (absDist > 2) return null;

            const isCenter = dist === 0;
            const translateX = dist * STEP + (isCenter ? dragOffset : dragOffset * 0.4);
            const scale = isCenter ? 1 : absDist === 1 ? 0.76 : 0.58;
            const opacity = isCenter ? 1 : absDist === 1 ? 0.4 : 0.12;

            return (
              <div
                key={etf.ticker}
                aria-hidden={!isCenter}
                style={{
                  transform: `translate(-50%, -50%) translateX(${translateX}px) scale(${scale})`,
                  opacity,
                  zIndex: 10 - absDist,
                  transition: drag
                    ? "none"
                    : reducedMotion
                      ? "none"
                      : "transform 500ms cubic-bezier(0.22,1,0.36,1), opacity 500ms ease-out",
                }}
                className={`absolute left-1/2 top-1/2 ${
                  isCenter ? "w-[260px] sm:w-[420px]" : "w-[112px] sm:w-[160px]"
                }`}
              >
                {isCenter ? (
                  <CenterCard
                    etf={active}
                    rank={activeIndex + 1}
                    animatedYield={animatedYield}
                    animatedScore={animatedScore}
                    updatedAt={updatedAt}
                    pulseKey={pulseTick}
                    reducedMotion={reducedMotion}
                    onNavigate={registerInteraction}
                  />
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      registerInteraction();
                      goTo(i);
                    }}
                    className="w-full text-left border border-[var(--gray-200)] rounded-xl bg-white px-4 py-3 pointer-events-auto"
                  >
                    <div className="text-[10px] text-[var(--gray-400)]">#{i + 1}</div>
                    <div className="font-bold text-sm">{etf.ticker}</div>
                    <div className="text-base font-extrabold text-[var(--crady-accent)]">
                      {etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : "—"}
                    </div>
                  </button>
                )}
              </div>
            );
          })}

          {/* Prev/next — desktop only, appear on hover of the whole region */}
          {!isMobile && (
            <>
              <button
                type="button"
                aria-label="이전 ETF"
                onClick={() => {
                  registerInteraction();
                  prev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-[var(--gray-200)] shadow-sm flex items-center justify-center opacity-0 hover:opacity-100 focus-visible:opacity-100 [section:hover_&]:opacity-100 transition-opacity"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="다음 ETF"
                onClick={() => {
                  registerInteraction();
                  next();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-[var(--gray-200)] shadow-sm flex items-center justify-center opacity-0 hover:opacity-100 focus-visible:opacity-100 [section:hover_&]:opacity-100 transition-opacity"
              >
                →
              </button>
            </>
          )}
        </div>

        {/* Indicator / mini rank nav — ticker pills, active one scrolled into view */}
        <div className="relative border-t border-[var(--gray-200)] bg-[var(--gray-50)]">
          <div
            className="flex gap-1.5 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {top10.map((etf, i) => (
              <button
                key={etf.ticker}
                ref={(el) => {
                  if (el) indicatorRefs.current.set(i, el);
                  else indicatorRefs.current.delete(i);
                }}
                type="button"
                aria-current={i === activeIndex}
                aria-label={`${i + 1}위 ${etf.ticker} 보기`}
                onClick={() => {
                  registerInteraction();
                  goTo(i);
                }}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  i === activeIndex
                    ? "bg-[var(--crady-accent)] text-black"
                    : "text-[var(--gray-500)] hover:text-black hover:bg-[var(--gray-100)]"
                }`}
              >
                {etf.ticker}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop-only right rail — PC's job is exploration, so give it the
          full ranked list at a glance instead of the mobile pill strip. */}
      <aside className="hidden xl:flex xl:flex-col border border-[var(--gray-200)] rounded-2xl overflow-hidden h-[340px]">
        <div className="px-4 py-2.5 border-b border-[var(--gray-200)] bg-[var(--gray-50)] text-xs font-semibold text-[var(--gray-500)] shrink-0">
          TOP 10 연환산 분배율
        </div>
        <ul className="overflow-y-auto flex-1">
          {top10.map((etf, i) => (
            <li key={etf.ticker}>
              <button
                type="button"
                onClick={() => {
                  registerInteraction();
                  goTo(i);
                }}
                aria-current={i === activeIndex}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-left border-b border-[var(--gray-100)] last:border-0 transition-colors ${
                  i === activeIndex
                    ? "bg-[var(--gray-100)]"
                    : "hover:bg-[var(--gray-50)]"
                }`}
              >
                <span className="w-4 text-[10px] text-[var(--gray-400)] font-medium">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold flex-1 min-w-0 truncate">
                  {etf.ticker}
                </span>
                <span className="text-sm font-bold text-[var(--crady-accent)]">
                  {etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      </div>
    </section>
  );
}

function CenterCard({
  etf,
  rank,
  animatedYield,
  animatedScore,
  updatedAt,
  pulseKey,
  reducedMotion,
  onNavigate,
}: {
  etf: EtfSnapshot;
  rank: number;
  animatedYield: number;
  animatedScore: number;
  updatedAt: string | null;
  pulseKey: number;
  reducedMotion: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="pointer-events-auto px-2 sm:px-4">
      <div className="text-xs font-semibold text-[var(--gray-500)] tracking-wide">
        연환산 분배율 {rank}위
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          key={pulseKey}
          className={`text-5xl sm:text-7xl font-black text-[var(--crady-accent)] tabular-nums leading-none ${
            reducedMotion ? "" : "animate-hero-pop"
          }`}
        >
          {animatedYield.toFixed(1)}%
        </span>
      </div>

      {/* Ticker/name/provider/risk/score/CTA all settle together on the same
          key — everything about the ETF changes as one synchronized unit,
          not a number that eases in next to labels that hard-cut. */}
      <div
        key={pulseKey}
        className={reducedMotion ? "" : "animate-hero-fade"}
      >
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-extrabold">{etf.ticker}</span>
          {etf.riskLevel && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
              {RISK_LABEL[etf.riskLevel] ?? etf.riskLevel}
            </span>
          )}
        </div>
        <div className="text-sm text-[var(--gray-500)] max-w-[150px] sm:max-w-none truncate">
          {providerLabel(etf.provider_id)}
          {etf.name ? ` · ${etf.name}` : ""}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[var(--gray-600)]">
          {etf.cradyScore != null && (
            <span>
              CRADY 점수{" "}
              <strong className="text-black tabular-nums">
                {animatedScore.toFixed(1)}
              </strong>
            </span>
          )}
          <span className="hidden sm:inline">
            최근 90일 실지급 배당 run-rate 기준 연환산 분배율(Distribution Yield)
          </span>
          {updatedAt && <span className="hidden sm:inline">{updatedAt} KST 업데이트</span>}
        </div>

        <p className="mt-2 text-xs text-[var(--gray-400)] max-w-xl">
          높은 분배율은 원금 손실 및 분배금 감소 위험을 포함하며 수익을 보장하지 않습니다.
        </p>

        <Link
          href={`/${etf.ticker.toLowerCase()}`}
          onClick={onNavigate}
          className="mt-4 inline-flex items-center justify-center px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-[var(--gray-900)] transition-colors"
        >
          ETF 상세 보기 →
        </Link>
      </div>
    </div>
  );
}
