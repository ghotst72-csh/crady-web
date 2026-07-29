"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { providerLabel, type EtfSnapshot } from "@/lib/data";

const RISK_LABEL: Record<string, string> = {
  SAFE: "안정",
  NORMAL: "보통",
  RISKY: "위험",
  EXTREME: "고위험",
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatUpdatedAt(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return null;
  }
}

function CountUpPercent({ target }: { target: number }) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    // Reduced-motion is already handled by the lazy useState initializer
    // above (skips straight to `target`) — nothing to animate here.
    if (prefersReducedMotion()) return;

    let raf: number;
    const durationMs = 900;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      // ease-out cubic — fast start, gentle settle
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <>{value.toFixed(1)}%</>;
}

export function YieldHeroTop10({ top10 }: { top10: EtfSnapshot[] }) {
  const leader = top10[0];
  const rest = top10.slice(1);
  const railRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion() || rest.length === 0) return;
    const el = railRef.current;
    if (!el) return;

    const interval = setInterval(() => {
      if (pausedRef.current) return;
      const cardWidth = el.firstElementChild
        ? (el.firstElementChild as HTMLElement).offsetWidth + 12
        : 220;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({
        left: atEnd ? 0 : el.scrollLeft + cardWidth,
        behavior: "smooth",
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [rest.length]);

  if (!leader) return null;

  const updatedAt = formatUpdatedAt(leader.calculatedAt);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
      <div className="border border-[var(--gray-200)] rounded-2xl overflow-hidden">
        {/* #1 — the number the whole page exists to show */}
        <div className="p-6 sm:p-10">
          <div className="text-xs font-semibold text-[var(--gray-500)] tracking-wide">
            연환산 분배율 1위
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="text-6xl sm:text-8xl font-black text-[var(--crady-accent)] tabular-nums leading-none">
              <CountUpPercent target={leader.annualYieldPct ?? 0} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold">
                  {leader.ticker}
                </span>
                {leader.riskLevel && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                    {RISK_LABEL[leader.riskLevel] ?? leader.riskLevel}
                  </span>
                )}
              </div>
              <div className="text-sm text-[var(--gray-500)]">
                {providerLabel(leader.provider_id)}
                {leader.name ? ` · ${leader.name}` : ""}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-[var(--gray-600)]">
            {leader.cradyScore != null && (
              <span>
                CRADY 점수 <strong className="text-black">{leader.cradyScore.toFixed(1)}</strong>
              </span>
            )}
            <span>최근 90일 실지급 배당 run-rate 기준 연환산 분배율(Distribution Yield)</span>
            {updatedAt && <span>{updatedAt} KST 업데이트</span>}
          </div>

          <p className="mt-3 text-xs text-[var(--gray-400)] max-w-2xl">
            높은 분배율은 원금 손실 및 분배금 감소 위험을 포함하며 수익을 보장하지
            않습니다. 투자 권유가 아닌 정보 제공 목적입니다.
          </p>

          <Link
            href={`/${leader.ticker.toLowerCase()}`}
            className="mt-5 inline-flex items-center justify-center px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-[var(--gray-900)] transition-colors"
          >
            ETF 상세 보기 →
          </Link>
        </div>

        {/* #2-10 — auto-scrolling rail, pauses on hover/touch, swipeable */}
        {rest.length > 0 && (
          <div className="border-t border-[var(--gray-200)] bg-[var(--gray-50)] px-4 sm:px-6 py-4">
            <div className="text-xs font-semibold text-[var(--gray-500)] mb-2">
              연환산 분배율 TOP 10
            </div>
            <div
              ref={railRef}
              onMouseEnter={() => (pausedRef.current = true)}
              onMouseLeave={() => (pausedRef.current = false)}
              onTouchStart={() => (pausedRef.current = true)}
              onTouchEnd={() => {
                setTimeout(() => (pausedRef.current = false), 1500);
              }}
              onPointerDown={() => (pausedRef.current = true)}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1"
              style={{ scrollbarWidth: "thin" }}
            >
              {rest.map((etf, i) => (
                <Link
                  key={etf.ticker}
                  href={`/${etf.ticker.toLowerCase()}`}
                  className="snap-start shrink-0 w-[150px] border border-[var(--gray-200)] rounded-xl p-3 bg-white hover:border-black transition-colors"
                >
                  <div className="text-[10px] text-[var(--gray-400)]">#{i + 2}</div>
                  <div className="font-bold">{etf.ticker}</div>
                  <div className="text-lg font-extrabold text-[var(--crady-accent)]">
                    {etf.annualYieldPct != null ? `${etf.annualYieldPct.toFixed(1)}%` : "—"}
                  </div>
                  {etf.riskLevel && (
                    <div className="text-[10px] text-[var(--gray-500)] mt-0.5">
                      {RISK_LABEL[etf.riskLevel] ?? etf.riskLevel}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
