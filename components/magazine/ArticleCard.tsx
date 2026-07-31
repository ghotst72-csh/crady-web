import Link from "next/link";
import type { ReactNode } from "react";

/** Text-forward editorial card (Part 6 of the Visual Hierarchy redesign):
 * badge, large ticker, smaller subtitle, one important number, short
 * summary — no thumbnail image. The previous version used each ticker's
 * dynamic OG-image route as a card thumbnail, which meant every card on
 * the Magazine hub triggered its own server-rendered image fetch (slow,
 * and a real CLS/LCP risk on a page with dozens of cards) for a visual
 * that, at card size, mostly read as a pale near-empty box anyway — a pure
 * server-rendered text card is faster, jump-free, and reads better at a
 * glance, matching the "Bloomberg/Apple News, not Excel" brief. */
export type ExtraStat = { label: string; value: string };

export function ArticleCard({
  href,
  ticker,
  badge,
  subtitle,
  metricLabel,
  metricValue,
  summary,
  extraStats,
  cta,
  featured = false,
}: {
  href: string;
  ticker: string;
  badge?: ReactNode;
  subtitle?: string;
  metricLabel?: string;
  metricValue?: string;
  summary?: string;
  /** Extra key/value facts shown only in the featured slot — real content
   * to fill the hero card's larger footprint rather than empty whitespace
   * (Part 8: "large empty areas should usually contain useful information"). */
  extraStats?: ExtraStat[];
  /** Featured slot only — a newspaper-style "read the full story" line, so
   * the hero card reads as headline → stat → stats → summary → CTA instead
   * of stopping at the summary (Visual Hierarchy Phase 2, Part 4). */
  cta?: string;
  /** Larger type scale for the single hero-slot card in a featured layout. */
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block h-full border border-[var(--gray-200)] rounded-xl p-4 sm:p-5 hover:border-black hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`font-black tracking-tight group-hover:underline ${featured ? "text-2xl sm:text-3xl" : "text-lg"}`}
        >
          {ticker}
        </span>
        {badge}
      </div>
      {subtitle && <div className="mt-1 text-xs text-[var(--gray-500)]">{subtitle}</div>}
      {metricValue != null && (
        <div className="mt-2.5">
          {/* #92400e, not --crady-accent — see KpiCard.tsx for why. The
              featured stat is the page's "primary statistic," sized to
              outweigh the summary paragraph below it, not just sit above it
              (Part 4: "the statistic should be visually stronger than the
              paragraph") — same hero-number scale already used for the
              Distribution Center and Ranking leader cards, not a new token. */}
          <div className={`font-black text-[#92400e] leading-none ${featured ? "text-4xl sm:text-5xl" : "text-xl"}`}>
            {metricValue}
          </div>
          {metricLabel && <div className="text-[11px] text-[var(--gray-600)] mt-1.5">{metricLabel}</div>}
        </div>
      )}
      {summary && (
        <p
          className={`mt-2.5 text-[var(--gray-600)] ${
            featured ? "text-sm line-clamp-2" : "text-xs line-clamp-1"
          }`}
        >
          {summary}
        </p>
      )}
      {featured && extraStats && extraStats.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[var(--gray-100)] grid grid-cols-3 gap-3">
          {extraStats.map((s) => (
            <div key={s.label}>
              <div className="text-sm sm:text-base font-bold">{s.value}</div>
              <div className="text-[11px] text-[var(--gray-600)] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {featured && cta && (
        <div className="mt-4 text-sm font-bold text-[#92400e] group-hover:underline">{cta}</div>
      )}
    </Link>
  );
}
