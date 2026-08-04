import Link from "next/link";
import { providerLabel } from "@/lib/data";
import { DividendStagePill } from "./DividendLifecycle";
import { Sparkline } from "./ui/Sparkline";
import { RangeBar } from "./ui/RangeBar";
import { Badge } from "./ui/Badge";
import { PriceBlock } from "./ticker/PriceBlock";
import type { TrendWindow } from "@/lib/magazine/trend";
import type { PriceSummary, DividendPriceComparison } from "@/lib/ticker/priceSummary";
import type { YieldPercentileResult } from "@/lib/ticker/yieldContext";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

// Same tint map as the homepage Hero (components/home/Hero.tsx) — kept
// as a small local copy rather than a shared import since it's 3 lines and
// pulling in the client Hero component here would drag its "use client"
// boundary into this server component for no reason.
const PROVIDER_GLOW: Record<string, string> = {
  yieldmax: "radial-gradient(60% 100% at 15% 20%, rgba(245,158,11,0.07), transparent 70%)",
  roundhill: "radial-gradient(60% 100% at 15% 20%, rgba(59,130,246,0.07), transparent 70%)",
  defiance: "radial-gradient(60% 100% at 15% 20%, rgba(34,197,94,0.07), transparent 70%)",
};

function formatUpdatedAt(iso: string | null, lang: "en" | "ko"): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
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

const T = {
  yieldLabel: { en: "Annual Distribution Yield", ko: "연환산 분배율" },
  updated: { en: "Updated", ko: "업데이트" },
  cradyScore: { en: "CRADY Score", ko: "CRADY 점수" },
  recentDividend: { en: "Recent Dividend", ko: "최근 배당금" },
  nextPayDate: { en: "Next Dividend", ko: "다음 지급일" },
  tbd: { en: "TBD", ko: "미정" },
  frequency: { en: "Dividend Frequency", ko: "배당 주기" },
  risk: { en: "Risk", ko: "위험도" },
  stability: { en: "Dividend Stability", ko: "배당 안정성" },
  nextExpected: { en: "Next expected dividend", ko: "다음 예상 배당" },
  vsLast: { en: "vs last", ko: "직전 대비" },
  confidence: { en: "confidence", ko: "신뢰도" },
  noPrediction: {
    en: "No prediction available yet.",
    ko: "아직 예측 데이터가 없습니다.",
  },
  dueToday: { en: "Paying today", ko: "오늘 지급" },
  daysLeft: { en: (n: number) => `D-${n}`, ko: (n: number) => `D-${n}` },
  recentPayments: { en: "Last 3 Payments", ko: "최근 3회 지급" },
  trend12mo: { en: "12-Month Trend", ko: "최근 12개월 추세" },
  payments: { en: "payments", ko: "회" },
  avgChange: { en: "avg. change per payment", ko: "지급당 평균 변동" },
  asOf: { en: "As of", ko: "" },
  asOfSuffix: { en: "", ko: " 기준" },
  last30Days: { en: "Last 30 Days", ko: "최근 30일" },
  price: { en: "Price", ko: "가격" },
  dividend: { en: "Dividend", ko: "배당" },
} as const;

export type EtfHeroQuickLink = { href: string; label: string };

export function EtfHero({
  ticker,
  name,
  providerId,
  category,
  riskLevel,
  updatedAt,
  yieldPct,
  cradyScore,
  dividendStabilityScore,
  payoutFrequency,
  latestDividend,
  prediction,
  changeFromLastPct,
  recentPayments = [],
  trend12mo = null,
  directAnswer,
  priceSummary = null,
  dividendPriceComparison = null,
  yieldContext = null,
  quickLinks = [],
  lang = "en",
}: {
  ticker: string;
  name: string | null;
  providerId: string;
  category: string | null;
  riskLevel: string | null;
  updatedAt: string | null;
  yieldPct: number | null;
  cradyScore: number | null;
  dividendStabilityScore: number | null;
  payoutFrequency: string | null;
  latestDividend: { amount: number; payDate: string } | null;
  prediction: {
    targetPayDate: string | null;
    targetExDate: string | null;
    predictedAmount: number | null;
    confidenceScore: number | null;
  } | null;
  changeFromLastPct: number | null;
  /** Last 3 actual payments, most recent first — for the at-a-glance
   * "recent activity" strip (Web UX/SEO Phase 2, Part 4). */
  recentPayments?: { amount: number | null; payDate: string }[];
  /** The 365-day window from lib/magazine/trend.ts's computeDividendTrend —
   * reused as-is rather than recomputed, so the Hero's trend figure can
   * never drift from the Magazine system's own trend numbers. */
  trend12mo?: TrendWindow | null;
  /** One short, self-contained "direct answer" sentence (SEO Authority
   * Phase 2, lib/ticker/directAnswer.ts) — deliberately the single most
   * prominent position on the page, above the yield headline, distinct
   * from the longer ProfileSnippet paragraph rendered below the Hero. */
  directAnswer?: string;
  /** Investor Dashboard Redesign (ETF Detail Page v3) — real current
   * price, today's change, and 1W/1M/3M sparkline data, built by
   * lib/ticker/priceSummary.ts from the same price history array already
   * fetched for the rest of the page. Null/currentPrice-null falls back
   * to the yield-only headline rather than showing a fabricated price. */
  priceSummary?: PriceSummary | null;
  /** "Price vs Dividend, Last 30 Days" (requirement #4). */
  dividendPriceComparison?: DividendPriceComparison | null;
  /** Sitewide yield-percentile context for the bare yield % (requirement
   * #6) — null when the sample is too small to be meaningful. */
  yieldContext?: YieldPercentileResult | null;
  /** Click-through row replacing the old single "View Dividend History"
   * button (requirement #10) — built by the page from real, existing
   * section anchors; a destination is simply omitted if that section
   * isn't rendered for this ticker (e.g. no Similar ETFs peers). */
  quickLinks?: EtfHeroQuickLink[];
  lang?: "en" | "ko";
}) {
  const glow = PROVIDER_GLOW[providerId] ?? "none";
  const updatedAtLabel = formatUpdatedAt(updatedAt, lang);
  const hasPrediction =
    prediction != null &&
    (prediction.predictedAmount != null || prediction.targetPayDate != null);
  const riskLabel = riskLevel ? (RISK_LABEL[lang][riskLevel] ?? riskLevel) : null;
  const dDay = prediction?.targetPayDate ? daysUntil(prediction.targetPayDate) : null;

  const priceAsOfLabel =
    priceSummary?.asOfDate != null
      ? lang === "ko"
        ? `${priceSummary.asOfDate}${T.asOfSuffix.ko}`
        : `${T.asOf.en} ${priceSummary.asOfDate}`
      : null;

  const hasRange =
    priceSummary?.rangeLabel != null &&
    priceSummary.rangeHigh != null &&
    priceSummary.rangeLow != null &&
    priceSummary.currentPrice != null;

  const hasTrendCard =
    dividendPriceComparison != null &&
    (dividendPriceComparison.priceChangePct != null ||
      dividendPriceComparison.dividendChangePct != null);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
      <div className="relative border border-[var(--gray-200)] rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: glow }}
          aria-hidden
        />
        <div className="relative p-5 sm:p-8">
          {/* ETF identity */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{ticker}</h1>
            {name && (
              <span className="text-sm sm:text-base text-[var(--gray-500)]">{name}</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] font-medium">
              {providerLabel(providerId)}
            </span>
            {category && (
              <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                {category}
              </span>
            )}
            {riskLabel && (
              <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                {riskLabel}
              </span>
            )}
            {updatedAtLabel && (
              <span className="text-[var(--gray-400)] ml-auto">
                {updatedAtLabel} KST {T.updated[lang]}
              </span>
            )}
          </div>

          {directAnswer && (
            <p className="mt-3 text-sm sm:text-[15px] text-[var(--gray-700)] leading-relaxed max-w-2xl">
              {directAnswer}
            </p>
          )}

          {/* Price & Dividend — the single most important card on the page
              (requirement #3): current price + trend fused with the
              dividend numbers that explain *why* the price behaves the way
              it does, instead of three unrelated floating figures. */}
          <div className="mt-6 sm:mt-8 rounded-2xl border border-[var(--gray-200)] bg-gradient-to-br from-white to-[var(--gray-50)] p-5 sm:p-6">
            {priceSummary?.currentPrice != null ? (
              <PriceBlock summary={priceSummary} asOfLabel={priceAsOfLabel} lang={lang} />
            ) : (
              <div>
                <div className="text-hero-number text-5xl sm:text-7xl text-[var(--crady-accent)]">
                  {yieldPct != null ? `${yieldPct.toFixed(1)}%` : "—"}
                </div>
                <div className="mt-2 text-sm font-semibold text-[var(--gray-600)]">
                  {T.yieldLabel[lang]}
                </div>
              </div>
            )}

            {/* Stacked on mobile, not a rigid 3-col grid — at 390px each
                column was too narrow for the yield-percentile badge
                ("Top 25% among covered-call ETFs"), which pushed past the
                viewport edge. Verified via a real Playwright overflow scan
                against production, not assumed. */}
            <div className="mt-5 pt-5 border-t border-[var(--gray-200)] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <MiniStat
                label={T.nextPayDate[lang]}
                value={prediction?.predictedAmount != null ? `$${prediction.predictedAmount.toFixed(4)}` : "—"}
                sub={prediction?.targetPayDate ?? T.tbd[lang]}
              />
              <MiniStat
                label={T.recentDividend[lang]}
                value={latestDividend ? `$${latestDividend.amount.toFixed(4)}` : "—"}
                sub={latestDividend?.payDate}
              />
              <MiniStat
                label={T.yieldLabel[lang]}
                value={yieldPct != null ? `${yieldPct.toFixed(1)}%` : "—"}
                accent
                badge={yieldContext?.label}
              />
            </div>
          </div>

          {/* 52-week range + Price-vs-Dividend 30-day comparison
              (requirements #4/#5) — omitted individually when there isn't
              enough real data behind either one. */}
          {(hasRange || hasTrendCard) && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {hasRange && (
                <RangeBar
                  low={priceSummary!.rangeLow!}
                  high={priceSummary!.rangeHigh!}
                  current={priceSummary!.currentPrice!}
                  rangeLabel={priceSummary!.rangeLabel!}
                  lang={lang}
                />
              )}
              {hasTrendCard && (
                <div className="rounded-xl border border-[var(--gray-200)] bg-white/70 p-4">
                  <div className="text-caption">{T.last30Days[lang]}</div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <TrendCell label={T.price[lang]} changePct={dividendPriceComparison!.priceChangePct} />
                    <TrendCell label={T.dividend[lang]} changePct={dividendPriceComparison!.dividendChangePct} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Secondary KPI grid — CRADY / Stability / Risk / Frequency.
              Current Price, Today's Change, Next/Recent Dividend and
              Annual Yield already have their own prominent slots above, so
              they aren't repeated here (Web UX request #7's priority order
              is reflected in *where* each figure lives, not by cramming
              all 8 into one undifferentiated grid). */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              icon={<IconGauge />}
              label={T.cradyScore[lang]}
              englishLabel={lang === "ko" ? "CRADY Score" : undefined}
              value={cradyScore != null ? cradyScore.toFixed(1) : "—"}
              accent
            />
            <KpiCard
              icon={<IconShield />}
              label={T.stability[lang]}
              englishLabel={lang === "ko" ? "Dividend Stability" : undefined}
              value={dividendStabilityScore != null ? dividendStabilityScore.toFixed(1) : "—"}
            />
            <KpiCard
              icon={<IconAlertTriangle />}
              label={T.risk[lang]}
              englishLabel={lang === "ko" ? "Risk" : undefined}
              value={riskLabel ?? "—"}
            />
            <KpiCard
              icon={<IconCalendar />}
              label={T.frequency[lang]}
              englishLabel={lang === "ko" ? "Dividend Frequency" : undefined}
              value={
                payoutFrequency && payoutFrequency.toLowerCase() !== "unknown"
                  ? payoutFrequency
                  : "—"
              }
            />
          </div>

          {/* Next predicted dividend — a compact line, never a large empty
              card when there's nothing to predict yet. D-Day countdown is
              the first thing in the row so "how soon" reads immediately. */}
          <div className="mt-6 pt-5 border-t border-[var(--gray-200)]">
            {hasPrediction ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
                {dDay != null && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-black text-white text-xs font-bold tabular-nums">
                    {dDay <= 0 ? T.dueToday[lang] : T.daysLeft[lang](dDay)}
                  </span>
                )}
                {prediction!.targetExDate && prediction!.targetPayDate && (
                  <DividendStagePill
                    exDate={prediction!.targetExDate}
                    payDate={prediction!.targetPayDate}
                    lang={lang}
                  />
                )}
                <span className="text-[var(--gray-700)]">
                  {T.nextExpected[lang]}{" "}
                  {prediction!.targetPayDate && (
                    <>
                      <strong className="font-semibold">{prediction!.targetPayDate}</strong>{" "}
                    </>
                  )}
                  {prediction!.predictedAmount != null && (
                    <>
                      {/* #92400e, not --crady-accent — see components/ui/KpiCard.tsx for why. */}
                      <strong className="text-[#92400e]">
                        ${prediction!.predictedAmount.toFixed(4)}
                      </strong>{" "}
                    </>
                  )}
                  {lang === "ko" ? "예상" : "expected"}
                  {changeFromLastPct != null &&
                    ` (${T.vsLast[lang]} ${changeFromLastPct > 0 ? "+" : ""}${changeFromLastPct.toFixed(1)}%)`}
                  {prediction!.confidenceScore != null &&
                    ` · ${T.confidence[lang]} ${prediction!.confidenceScore.toFixed(0)}%`}
                </span>
              </div>
            ) : (
              <p className="text-sm text-[var(--gray-400)]">{T.noPrediction[lang]}</p>
            )}
          </div>

          {/* Recent activity strip — last 3 actual payments (with
              payment-over-payment deltas) and the 12-month trend, so "has
              this ETF's dividend been rising or falling" reads at a glance
              without scrolling to the history table (Part 4). */}
          {(recentPayments.length > 0 || (trend12mo && trend12mo.count > 0)) && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {recentPayments.length > 0 && (
                <div className="card-interactive border border-[var(--gray-200)] rounded-xl p-4 bg-white/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-caption">{T.recentPayments[lang]}</div>
                    <Sparkline
                      values={[...recentPayments].reverse().map((p) => p.amount)}
                      color="auto"
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {recentPayments.map((p, i) => {
                      const prior = recentPayments[i + 1]?.amount ?? null;
                      const delta = p.amount != null && prior != null ? p.amount - prior : null;
                      return (
                        <span key={p.payDate} className="tabular-nums">
                          <span className="text-[var(--gray-500)]">{p.payDate.slice(5)}</span>{" "}
                          <span
                            className={`font-semibold ${
                              delta != null && delta > 0
                                ? "text-emerald-700"
                                : delta != null && delta < 0
                                  ? "text-red-700"
                                  : ""
                            }`}
                          >
                            {p.amount != null ? `$${p.amount.toFixed(4)}` : "—"}
                            {delta != null && delta !== 0 && (delta > 0 ? " ▲" : " ▼")}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {trend12mo && trend12mo.count > 0 && (
                <div className="card-interactive border border-[var(--gray-200)] rounded-xl p-4 bg-white/70">
                  <div className="text-caption mb-1.5">{T.trend12mo[lang]}</div>
                  <div className="text-sm">
                    <span className="font-semibold tabular-nums">
                      <span className="text-emerald-700">{trend12mo.increases}↑</span>
                      {" / "}
                      <span className="text-red-700">{trend12mo.decreases}↓</span>
                    </span>{" "}
                    <span className="text-[var(--gray-500)]">
                      · {trend12mo.count} {T.payments[lang]}
                    </span>
                    {trend12mo.avgChangePct != null && (
                      <div className="text-xs text-[var(--gray-500)] mt-0.5">
                        {trend12mo.avgChangePct > 0 ? "+" : ""}
                        {trend12mo.avgChangePct.toFixed(1)}% {T.avgChange[lang]}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Links (requirement #10) — encourages natural
              navigation into the rest of the site instead of a single dead
              -end CTA. Built by the page from real section anchors; any
              destination without real content behind it is simply omitted
              by the caller. */}
          {quickLinks.length > 0 && (
            <div className="mt-6 pt-5 border-t border-[var(--gray-200)] flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center px-3.5 py-2 border border-[var(--gray-200)] rounded-lg text-sm font-medium hover:border-black hover:bg-[var(--gray-50)] transition-colors"
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  sub,
  accent,
  badge,
}: {
  label: string;
  value: string;
  sub?: string | null;
  accent?: boolean;
  badge?: string | null;
}) {
  return (
    <div>
      <div className="text-caption">{label}</div>
      <div
        className={`mt-1 text-xl sm:text-2xl font-extrabold tabular-nums ${
          accent ? "text-[var(--crady-accent)]" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--gray-500)] mt-0.5 truncate">{sub}</div>}
      {badge && (
        <div className="mt-1.5">
          {/* whitespace-normal override — Badge defaults to nowrap, which
              is right for short tags but this one ("Top 25% among
              covered-call ETFs") is long enough to need to wrap even in a
              full-width mobile column. */}
          <Badge variant="accent" className="whitespace-normal text-left">
            {badge}
          </Badge>
        </div>
      )}
    </div>
  );
}

function TrendCell({ label, changePct }: { label: string; changePct: number | null }) {
  if (changePct == null) {
    return (
      <div>
        <div className="text-xs text-[var(--gray-500)]">{label}</div>
        <div className="text-sm text-[var(--gray-400)] mt-0.5">—</div>
      </div>
    );
  }
  const up = changePct >= 0;
  return (
    <div>
      <div className="text-xs text-[var(--gray-500)]">{label}</div>
      <div
        className={`text-base font-bold tabular-nums mt-0.5 ${
          up ? "text-emerald-700" : "text-red-700"
        }`}
      >
        {up ? "▲" : "▼"} {up ? "+" : ""}
        {changePct.toFixed(1)}%
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  englishLabel,
  value,
  sub,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  englishLabel?: string;
  value: string;
  sub?: string | null;
  accent?: boolean;
}) {
  return (
    <div className="card-interactive rounded-xl bg-white/70 border border-[var(--gray-200)] p-4">
      <div className="flex items-center gap-1.5 text-[var(--gray-400)]">
        {icon}
        <div className="text-[11px] text-[var(--gray-500)] font-medium leading-tight">
          {label}
        </div>
      </div>
      {englishLabel && (
        <div className="text-[9px] text-[var(--gray-400)] leading-tight">{englishLabel}</div>
      )}
      <div
        className={`mt-1.5 text-lg font-extrabold tabular-nums ${
          accent ? "text-[var(--crady-accent)]" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-[var(--gray-400)] mt-0.5">{sub}</div>}
    </div>
  );
}

const ICON_PROPS = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  className: "h-3.5 w-3.5 shrink-0",
  "aria-hidden": true,
} as const;

function IconGauge() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M2 12a6 6 0 1 1 12 0" strokeLinecap="round" />
      <path d="M8 12 11 7" strokeLinecap="round" />
      <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 1.5 13.5 3.5V7.5C13.5 11 11 13.5 8 14.5C5 13.5 2.5 11 2.5 7.5V3.5L8 1.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconAlertTriangle() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 2 14.5 13.5H1.5L8 2Z" strokeLinejoin="round" />
      <path d="M8 6.5V9.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5H14" strokeLinecap="round" />
      <path d="M5 1.5V4" strokeLinecap="round" />
      <path d="M11 1.5V4" strokeLinecap="round" />
    </svg>
  );
}
