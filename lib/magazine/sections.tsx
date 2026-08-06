import Link from "next/link";
import { providerLabel, type ComparisonPeer } from "@/lib/data";
import { DividendStagePill } from "@/components/DividendLifecycle";
import { KpiCard, KpiGrid, type KpiItem } from "@/components/ui/KpiCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { Badge } from "@/components/ui/Badge";
import { KeyTakeaways } from "@/components/ui/KeyTakeaways";
import { formatConfidencePct } from "@/lib/confidence";
import type { ArticleData } from "./data";
import type { FaqItem, Section } from "./types";
import type { TrendWindow } from "./trend";
import { describeTiming, describeTimingKo, monthYearLabel, monthYearLabelKo } from "./timing";

const RISK_LABEL: Record<string, string> = {
  SAFE: "Safe",
  NORMAL: "Normal",
  RISKY: "Risky",
  EXTREME: "Extreme",
};

function fmtMoney(n: number | null | undefined, digits = 4): string {
  return n != null ? `$${n.toFixed(digits)}` : "—";
}
function fmtPct(n: number | null | undefined, digits = 1): string {
  return n != null ? `${n.toFixed(digits)}%` : "—";
}


/** Turns generate_next_predictions.py's machine-readable prediction_method
 * string (e.g. "scraped_schedule(n_actual=67)" or
 * "interval_estimate_weekly(n=12,median=7.0d)") into a plain-language
 * sentence, instead of a hardcoded generic phrase. */
function humanizePredictionMethod(method: string | null): string {
  if (!method) return "Estimated from recent distribution history.";
  if (method.startsWith("scraped_schedule")) {
    const n = method.match(/n_actual=(\d+)/)?.[1];
    return `Based on the officially published distribution schedule${
      n ? `, with the amount estimated from the last ${n} actual payments` : ""
    }.`;
  }
  if (method.startsWith("interval_estimate")) {
    const freq = method.match(/interval_estimate_(\w+)/)?.[1];
    const n = method.match(/n=(\d+)/)?.[1];
    const median = method.match(/median=([\d.]+)d/)?.[1];
    return `Estimated from a ${freq ?? "recurring"} payout pattern${
      n ? ` observed over ${n} payments` : ""
    }${median ? ` (~${median}-day interval)` : ""}.`;
  }
  return "Estimated from recent distribution history.";
}

// ── Section Library ──────────────────────────────────────────────────────────
// Every function here takes the same ArticleData bundle and returns a
// Section (heading + body) or null when there's nothing honest to say.
// Recipes (lib/magazine/recipes.ts) pick which of these to compose for a
// given article type — new article types are just new recipes, not new
// rendering code.

export function nextDividendHighlight(data: ArticleData): Section | null {
  const { ticker, prediction, changeFromLastPct, annualYieldPct, risk, payoutFrequency } = data;

  return {
    id: "next-dividend-highlight",
    heading: `CRADY Next Dividend Prediction`,
    body: (
      <div className="not-prose border border-[var(--gray-200)] rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-amber-50/40 to-transparent">
        {prediction ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                {ticker} Forecast
              </span>
              {prediction.target_ex_date && prediction.target_pay_date && (
                <DividendStagePill
                  exDate={prediction.target_ex_date}
                  payDate={prediction.target_pay_date}
                />
              )}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-[var(--gray-500)]">Expected Ex-Dividend Date</dt>
                <dd className="font-bold mt-0.5">{prediction.target_ex_date ?? "TBD"}</dd>
              </div>
              <div>
                <dt className="text-[var(--gray-500)]">Expected Payment Date</dt>
                <dd className="font-bold mt-0.5">{prediction.target_pay_date ?? "TBD"}</dd>
              </div>
              <div>
                <dt className="text-[var(--gray-500)]">Expected Dividend Amount</dt>
                <dd className="font-bold mt-0.5 text-[var(--crady-accent)]">
                  {fmtMoney(prediction.predicted_amount)}
                  {changeFromLastPct != null && (
                    <span className="ml-1.5 text-xs font-semibold text-[var(--gray-500)]">
                      ({changeFromLastPct > 0 ? "+" : ""}
                      {changeFromLastPct.toFixed(1)}% vs last)
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--gray-500)]">Prediction Confidence</dt>
                <dd className="font-bold mt-0.5">{fmtPct(prediction.confidence_score, 0)}</dd>
              </div>
              <div>
                <dt className="text-[var(--gray-500)]">Estimated Dividend Yield</dt>
                <dd className="font-bold mt-0.5">{fmtPct(annualYieldPct)}</dd>
              </div>
              <div>
                <dt className="text-[var(--gray-500)]">Payout Frequency</dt>
                <dd className="font-bold mt-0.5 capitalize">{payoutFrequency ?? "—"}</dd>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-[var(--gray-500)]">Prediction Method</dt>
                <dd className="font-semibold mt-0.5 text-[13px]">
                  {humanizePredictionMethod(prediction.prediction_method)}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--gray-500)]">Last Updated</dt>
                <dd className="font-bold mt-0.5">{risk?.calculated_at?.slice(0, 10) ?? "—"}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-sm text-[var(--gray-500)]">
            CRADY doesn&apos;t have enough recent distribution history to generate a reliable
            next-dividend prediction for {ticker} yet. Check the distribution history below for{" "}
            {ticker}&apos;s past payments.
          </p>
        )}
        <p className="mt-4 text-xs text-[var(--gray-400)]">
          Estimates are based on historical distribution patterns and public dividend schedules.
          Actual amounts and dates may change until officially declared.
        </p>
      </div>
    ),
  };
}

/** The prediction page's own take on risk — framed around how it affects
 * confidence in THIS forecast, in prose. Deliberately not the same
 * bullet-list format as riskAnalysisSection (which is risk-analysis's own,
 * general-purpose treatment) so the two pages never share duplicate text
 * even though both legitimately discuss the same underlying risk data. */
export function predictionReliabilityNote(data: ArticleData): Section | null {
  const { ticker, risk } = data;
  if (!risk?.risk_level) return null;

  const level = risk.risk_level;
  const volatility = risk.volatility_30d;
  const sensitivity =
    level === "SAFE"
      ? "tends to have relatively consistent payouts, so this estimate is less likely to be far off"
      : level === "NORMAL"
        ? "sees moderate swings in its underlying option income, so the actual amount could land somewhat above or below this estimate"
        : "carries high volatility, so the actual payout can deviate more than usual from this estimate";

  return {
    id: "prediction-reliability",
    heading: "How Reliable Is This Estimate?",
    body: (
      <p>
        {ticker} is classified as {RISK_LABEL[level]?.toLowerCase() ?? level.toLowerCase()} risk
        {volatility != null ? ` (${fmtPct(volatility)} 30-day volatility)` : ""} by CRADY, and{" "}
        {sensitivity}. Treat this forecast as a directional estimate rather than a guaranteed
        figure — see the full {ticker} Risk Analysis for a complete risk breakdown.
      </p>
    ),
  };
}

/** Aggregate view of distribution history for the guide page — deliberately
 * NOT the row-by-row table (that table is next-dividend-prediction's own,
 * evidence-for-the-forecast presentation of the same underlying rows). */
export function distributionSummarySection(data: ArticleData): Section | null {
  const { ticker, distributions } = data;
  const paid = distributions.filter((d) => d.amount != null);
  if (paid.length === 0) return null;

  const amounts = paid.map((d) => d.amount!);
  const total = amounts.reduce((a, b) => a + b, 0);
  const avg = total / amounts.length;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const oldestDate = paid[paid.length - 1].pay_date;
  const newestDate = paid[0].pay_date;

  return {
    id: "distribution-summary",
    heading: `${ticker} Distribution Summary`,
    body: (
      <div>
        <p>
          Over its last {paid.length} payments ({oldestDate} to {newestDate}), {ticker} paid a
          combined {fmtMoney(total, 2)} per share, averaging {fmtMoney(avg)} per distribution
          (ranging from {fmtMoney(min)} to {fmtMoney(max)}).
        </p>
        <p className="mt-2 text-sm text-[var(--gray-500)]">
          For the full payment-by-payment history and CRADY&apos;s next-payment forecast, see the{" "}
          <Link href={`/magazine/${ticker.toLowerCase()}-next-dividend-prediction`} className="underline hover:text-black">
            {ticker} Next Dividend Prediction
          </Link>
          .
        </p>
      </div>
    ),
  };
}

export function overviewSection(data: ArticleData): Section | null {
  const { ticker, etf } = data;
  const parts = [etf.short_description, etf.long_description].filter(Boolean);
  if (parts.length === 0 && !etf.category && !etf.asset_class) return null;

  return {
    id: "overview",
    heading: `${ticker} ETF Overview`,
    body: (
      <div>
        {parts.length > 0 && <p>{parts[0]}</p>}
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm not-prose">
          <li>
            <span className="text-[var(--gray-500)]">Provider: </span>
            {providerLabel(etf.provider_id)}
          </li>
          {etf.category && etf.category.toLowerCase() !== "unknown" && (
            <li>
              <span className="text-[var(--gray-500)]">Category: </span>
              {etf.category}
            </li>
          )}
          {etf.asset_class && (
            <li>
              <span className="text-[var(--gray-500)]">Asset Class: </span>
              {etf.asset_class}
            </li>
          )}
          {etf.benchmark && (
            <li>
              <span className="text-[var(--gray-500)]">Benchmark: </span>
              {etf.benchmark}
            </li>
          )}
        </ul>
      </div>
    ),
  };
}

export function investmentStrategySection(data: ArticleData): Section | null {
  const { etf } = data;
  const text = etf.investment_strategy || etf.long_description;
  if (!text) return null;
  return {
    id: "investment-strategy",
    heading: "Investment Strategy",
    body: <p className="whitespace-pre-line">{text}</p>,
  };
}

export function distributionHistorySection(data: ArticleData): Section | null {
  const { ticker, distributions } = data;
  if (distributions.length === 0) return null;
  const amounts = [...distributions].reverse().map((d) => d.amount);
  const paidCount = distributions.filter((d) => d.amount != null).length;
  const latest = distributions.find((d) => d.amount != null) ?? null;

  return {
    id: "distribution-history",
    heading: `${ticker} Distribution History`,
    body: (
      <div className="space-y-3">
        <KeyTakeaways
          heading="Key Takeaways"
          items={[
            `${paidCount} distribution${paidCount === 1 ? "" : "s"} on record in this window.`,
            ...(latest ? [`Most recent payment: ${fmtMoney(latest.amount)} per share on ${latest.pay_date}.`] : []),
          ]}
        />
        <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--gray-100)] bg-white">
            <span className="text-[11px] text-[var(--gray-500)] uppercase tracking-wide font-semibold">Trend</span>
            <Sparkline values={amounts} width={120} height={28} color="auto" />
          </div>
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--gray-50)] text-[var(--gray-500)]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Ex-Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Pay Date</th>
                  <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                  <th className="text-right px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {distributions.map((d, i) => {
                  const prior = distributions[i + 1]?.amount ?? null;
                  const delta = d.amount != null && prior != null ? d.amount - prior : null;
                  return (
                    <tr
                      key={`${d.ex_date}-${i}`}
                      className={`hover:bg-[var(--gray-100)]/60 transition-colors ${i % 2 === 1 ? "bg-[var(--gray-50)]/50" : ""}`}
                    >
                      <td className="px-4 py-2.5 text-[var(--gray-600)]">{d.ex_date}</td>
                      <td className="px-4 py-2.5 text-[var(--gray-600)]">{d.pay_date}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                        {fmtMoney(d.amount)}
                        {delta != null && delta !== 0 && (
                          <span className={`ml-1.5 text-xs ${delta > 0 ? "text-emerald-700" : "text-red-700"}`}>
                            {delta > 0 ? "▲" : "▼"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge variant={d.amount != null ? "green" : "neutral"}>
                          {d.amount != null ? "Paid" : "Upcoming"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ),
  };
}

export function recentTrendSection(data: ArticleData): Section | null {
  const { ticker, distributions } = data;
  const paid = distributions.filter((d) => d.amount != null);
  if (paid.length < 2) return null;

  const latest = paid[0].amount!;
  const prior = paid.slice(1, 4).reduce((a, d) => a + (d.amount ?? 0), 0) / Math.min(3, paid.length - 1);
  const changePct = prior > 0 ? ((latest - prior) / prior) * 100 : null;

  return {
    id: "recent-trend",
    heading: `Recent ${ticker} Distribution Trend`,
    body: (
      <p>
        {ticker}&apos;s most recent distribution was {fmtMoney(latest)}
        {changePct != null && (
          <>
            {" "}
            — {changePct >= 0 ? "up" : "down"} {Math.abs(changePct).toFixed(1)}% compared to its
            trailing average of {fmtMoney(prior)}.
          </>
        )}{" "}
        High-yield covered-call ETFs like {ticker} typically see distribution amounts fluctuate
        with underlying volatility and option premium income, so month-to-month changes are
        normal rather than a sign of a permanent cut.
      </p>
    ),
  };
}

export function yieldAnalysisSection(data: ArticleData): Section | null {
  const { ticker, annualYieldPct, price } = data;
  if (annualYieldPct == null) return null;
  return {
    id: "yield-analysis",
    heading: `${ticker} Dividend Yield Analysis`,
    body: (
      <p>
        Based on {ticker}&apos;s trailing 90-day distribution run-rate and its current price of{" "}
        {fmtMoney(price?.close_price, 2)}, CRADY estimates an annualized distribution yield of{" "}
        <strong>{fmtPct(annualYieldPct)}</strong>. This figure reflects recent actual payments
        extrapolated to a full year — not a guaranteed or contractual yield. High distribution
        yields on option-income ETFs often come from a mix of option premium and return of
        capital, which can affect the fund&apos;s share price over time.
      </p>
    ),
  };
}

export function riskAnalysisSection(data: ArticleData): Section | null {
  const { ticker, risk } = data;
  if (!risk) return null;

  // A tiered stat grid instead of four identical cards — Visual Hierarchy
  // Phase 2, Part 7: CRADY Score is the number that answers "should I care
  // about this ETF's risk," so it dominates; Risk Level is the second most
  // decision-relevant fact; Volatility and Drawdown are supporting detail
  // for someone who wants to know why.
  const cradyScore: KpiItem | null =
    risk.crady_score != null
      ? { label: "CRADY Score", value: risk.crady_score.toFixed(1), sublabel: "out of 100", accent: true }
      : null;
  const riskLevel: KpiItem | null = risk.risk_level
    ? { label: "Risk Level", value: RISK_LABEL[risk.risk_level] ?? risk.risk_level }
    : null;
  const supporting: KpiItem[] = [];
  if (risk.volatility_30d != null) {
    supporting.push({ label: "30-Day Volatility", value: fmtPct(risk.volatility_30d) });
  }
  if (risk.max_drawdown != null) {
    supporting.push({ label: "Max Drawdown", value: fmtPct(risk.max_drawdown) });
  }
  if (!cradyScore && !riskLevel && supporting.length === 0) return null;

  return {
    id: "risk-analysis",
    heading: `${ticker} Risk Analysis`,
    body: (
      <div className="not-prose flex flex-col gap-3">
        {cradyScore && <KpiCard {...cradyScore} size="lg" />}
        {riskLevel && <KpiCard {...riskLevel} size="md" />}
        {supporting.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {supporting.map((item) => (
              <KpiCard key={item.label} {...item} size="sm" />
            ))}
          </div>
        )}
      </div>
    ),
  };
}

export function dividendStabilitySection(data: ArticleData): Section | null {
  const { ticker, risk } = data;
  if (risk?.dividend_stability_score == null) return null;
  const score = risk.dividend_stability_score;
  const tone =
    score >= 75 ? "relatively consistent" : score >= 50 ? "moderately variable" : "quite variable";
  return {
    id: "dividend-stability",
    heading: `${ticker} Dividend Stability`,
    body: (
      <p>
        {ticker} has a dividend stability score of <strong>{score.toFixed(1)}</strong> out of 100,
        meaning its distribution amount has been {tone} over its recent payment history.
      </p>
    ),
  };
}

export function payoutFrequencySection(data: ArticleData): Section | null {
  const { ticker, payoutFrequency } = data;
  if (!payoutFrequency) return null;
  return {
    id: "payout-frequency",
    heading: `${ticker} Payout Frequency`,
    body: (
      <p>
        {ticker} pays distributions on a <strong>{payoutFrequency}</strong> schedule, based on its
        recent distribution history.
      </p>
    ),
  };
}

export function fundInfoSection(data: ArticleData): Section | null {
  const { ticker, etf } = data;
  const rows: [string, string][] = [];
  if (etf.expense_ratio && etf.expense_ratio.toLowerCase() !== "unknown")
    rows.push(["Expense Ratio", etf.expense_ratio]);
  if (etf.aum && etf.aum.toLowerCase() !== "unknown") rows.push(["AUM", etf.aum]);
  if (etf.inception_date) rows.push(["Inception Date", etf.inception_date]);
  if (etf.holdings_count != null) rows.push(["Holdings Count", String(etf.holdings_count)]);
  if (rows.length === 0) return null;

  return {
    id: "fund-info",
    heading: `${ticker} Fund Information`,
    body: (
      <dl className="not-prose grid grid-cols-2 gap-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[var(--gray-500)]">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    ),
  };
}

export function advantagesDisadvantagesSection(data: ArticleData): Section | null {
  const { ticker, risk, annualYieldPct, payoutFrequency } = data;
  if (!risk && annualYieldPct == null) return null;

  const advantages: string[] = [];
  const considerations: string[] = [];

  if (annualYieldPct != null && annualYieldPct >= 30) {
    advantages.push(`High estimated distribution yield (${fmtPct(annualYieldPct)} annualized).`);
  }
  if (payoutFrequency === "weekly") {
    advantages.push("Weekly payout frequency for investors who want frequent income.");
  }
  if (risk?.dividend_stability_score != null && risk.dividend_stability_score >= 75) {
    advantages.push("Relatively stable distribution history compared to peers.");
  }
  if (risk?.crady_score != null && risk.crady_score >= 70) {
    advantages.push(`Strong CRADY score (${risk.crady_score.toFixed(1)}/100).`);
  }

  if (risk?.volatility_30d != null && risk.volatility_30d >= 60) {
    considerations.push(`High recent volatility (${fmtPct(risk.volatility_30d)} over 30 days).`);
  }
  if (risk?.max_drawdown != null && risk.max_drawdown <= -20) {
    considerations.push(`Notable recent drawdown (${fmtPct(risk.max_drawdown)}).`);
  }
  if (risk?.dividend_stability_score != null && risk.dividend_stability_score < 50) {
    considerations.push("Distribution amount has varied significantly between payments.");
  }
  if (annualYieldPct != null && annualYieldPct >= 80) {
    considerations.push(
      "Very high yields on option-income ETFs can include return of capital, which may reduce NAV over time."
    );
  }

  if (advantages.length === 0 && considerations.length === 0) return null;

  return {
    id: "advantages-disadvantages",
    heading: `${ticker} Advantages and Considerations`,
    body: (
      <div className="grid sm:grid-cols-2 gap-6 not-prose">
        <div>
          <div className="text-sm font-semibold text-green-700 mb-2">Advantages</div>
          {advantages.length > 0 ? (
            <ul className="text-sm space-y-1.5 list-disc pl-4">
              {advantages.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--gray-400)]">No standout advantages identified.</p>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-red-700 mb-2">Considerations</div>
          {considerations.length > 0 ? (
            <ul className="text-sm space-y-1.5 list-disc pl-4">
              {considerations.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--gray-400)]">No major risk flags identified.</p>
          )}
        </div>
      </div>
    ),
  };
}

export function bestForSection(data: ArticleData): Section | null {
  const { ticker, risk, payoutFrequency } = data;
  if (!risk?.risk_level) return null;

  const level = risk.risk_level;
  const audience =
    level === "SAFE"
      ? "income-focused investors who prioritize capital stability alongside distributions"
      : level === "NORMAL"
        ? "investors comfortable with moderate volatility in exchange for higher income"
        : "experienced, risk-tolerant investors comfortable with significant price swings";

  return {
    id: "best-for",
    heading: `Who Is ${ticker} Best For?`,
    body: (
      <p>
        Given its {RISK_LABEL[level]?.toLowerCase() ?? level.toLowerCase()} risk profile
        {payoutFrequency ? ` and ${payoutFrequency} payout schedule` : ""}, {ticker} may be best
        suited for {audience}. This is not personalized investment advice — consider your own
        risk tolerance and financial goals.
      </p>
    ),
  };
}

export function faqSection(items: FaqItem[]): Section | null {
  if (items.length === 0) return null;
  return {
    id: "faq",
    heading: "Frequently Asked Questions",
    body: (
      <div className="not-prose divide-y divide-[var(--gray-100)]">
        {items.map((item) => (
          <div key={item.question} className="py-4 first:pt-0">
            <div className="font-semibold text-sm">{item.question}</div>
            <p className="mt-1.5 text-sm text-[var(--gray-600)]">{item.answer}</p>
          </div>
        ))}
      </div>
    ),
  };
}

/** dividend-calendar's own content: the provider's published future
 * pay/ex-date schedule as a forward-looking table. Deliberately NOT the
 * amount-focused single-event highlight box on next-dividend-prediction —
 * this shows however many dates are already scheduled, with no dollar
 * figures (those aren't known yet for scraped-schedule rows), framed around
 * "how many payments are already on the calendar." */
export function upcomingScheduleSection(data: ArticleData): Section | null {
  const { ticker, futureSchedule, etf } = data;
  if (futureSchedule.length === 0) return null;

  return {
    id: "upcoming-schedule",
    heading: `${ticker} Upcoming Dividend Calendar`,
    body: (
      <div>
        <p>
          {providerLabel(etf.provider_id)} has already published{" "}
          {futureSchedule.length === 1 ? "one upcoming payment date" : `${futureSchedule.length} upcoming payment dates`}{" "}
          for {ticker}. Exact per-payment amounts aren&apos;t announced this far ahead — see the{" "}
          <Link href={`/magazine/${ticker.toLowerCase()}-next-dividend-prediction`} className="underline hover:text-black">
            {ticker} Next Dividend Prediction
          </Link>{" "}
          for CRADY&apos;s estimate of the very next one.
        </p>
        <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden mt-4">
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--gray-50)] text-[var(--gray-500)]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Ex-Dividend Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Payment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {futureSchedule.map((s, i) => (
                  <tr
                    key={`${s.ex_date}-${i}`}
                    className={`hover:bg-[var(--gray-100)]/60 transition-colors ${i % 2 === 1 ? "bg-[var(--gray-50)]/50" : ""}`}
                  >
                    <td className="px-4 py-2.5 text-[var(--gray-700)] font-medium">{s.ex_date}</td>
                    <td className="px-4 py-2.5 text-[var(--gray-700)] font-medium">{s.pay_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ),
  };
}

/** dividend-history's year-by-year breakdown — a genuinely different
 * presentation from the flat row table (next-dividend-prediction) and the
 * single-paragraph aggregate (dividend-guide): grouped totals per calendar
 * year, so a reader can see growth/decline across years rather than a list
 * of individual payments. */
export function yearlyBreakdownSection(data: ArticleData): Section | null {
  const { ticker, distributionsExtended } = data;
  const paid = distributionsExtended.filter((d) => d.amount != null);
  if (paid.length === 0) return null;

  const byYear = new Map<string, { total: number; count: number }>();
  for (const d of paid) {
    const year = d.pay_date.slice(0, 4);
    const bucket = byYear.get(year) ?? { total: 0, count: 0 };
    bucket.total += d.amount!;
    bucket.count += 1;
    byYear.set(year, bucket);
  }
  const years = [...byYear.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const lifetimeTotal = paid.reduce((a, d) => a + d.amount!, 0);
  const bestYear = [...byYear.entries()].sort((a, b) => b[1].total - a[1].total)[0];

  return {
    id: "yearly-breakdown",
    heading: `${ticker} Dividend History by Year`,
    body: (
      <div className="space-y-3">
        <KeyTakeaways
          heading="Key Takeaways"
          items={[
            `${paid.length} recorded payments totaling $${lifetimeTotal.toFixed(2)} per share.`,
            ...(bestYear ? [`Highest-paying year: ${bestYear[0]} ($${bestYear[1].total.toFixed(2)} across ${bestYear[1].count} payments).`] : []),
          ]}
        />
        <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--gray-50)] text-[var(--gray-500)]">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Year</th>
                  <th className="text-right px-4 py-2.5 font-medium">Payments</th>
                  <th className="text-right px-4 py-2.5 font-medium">Total Paid</th>
                  <th className="text-right px-4 py-2.5 font-medium">YoY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {years.map(([year, bucket], i) => {
                  const prior = years[i + 1]?.[1].total ?? null;
                  const yoyDelta = prior != null && prior > 0 ? ((bucket.total - prior) / prior) * 100 : null;
                  return (
                    <tr
                      key={year}
                      className={`hover:bg-[var(--gray-100)]/60 transition-colors ${i % 2 === 1 ? "bg-[var(--gray-50)]/50" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-semibold">{year}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{bucket.count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">${bucket.total.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {yoyDelta != null ? (
                          <Badge variant={yoyDelta >= 0 ? "green" : "red"}>
                            {yoyDelta >= 0 ? "▲" : "▼"} {Math.abs(yoyDelta).toFixed(0)}%
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ),
  };
}

/** dividend-history's consistency angle — computed from the actual gaps
 * between payment dates, not the DB's dividend_stability_score (that's
 * riskAnalysisSection/dividendStabilitySection's own metric, on a different
 * page, framed around risk rather than payment cadence). */
export function paymentPatternSection(data: ArticleData): Section | null {
  const { ticker, distributionsExtended, payoutFrequency } = data;
  const paid = distributionsExtended.filter((d) => d.amount != null).slice().reverse();
  if (paid.length < 3) return null;

  const gaps: number[] = [];
  for (let i = 1; i < paid.length; i++) {
    const days = Math.round(
      (new Date(paid[i].pay_date).getTime() - new Date(paid[i - 1].pay_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (days > 0) gaps.push(days);
  }
  if (gaps.length === 0) return null;

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const maxGap = Math.max(...gaps);
  const minGap = Math.min(...gaps);
  const consistent = maxGap - minGap <= avgGap * 0.3;

  return {
    id: "payment-pattern",
    heading: `How Consistent Is ${ticker}'s Payment Schedule?`,
    body: (
      <p>
        Based on its last {paid.length} payments, {ticker} has paid out roughly every{" "}
        <strong>{avgGap.toFixed(0)} days</strong> on average
        {payoutFrequency ? ` (consistent with its ${payoutFrequency} schedule)` : ""}, ranging
        from {minGap} to {maxGap} days between payments. {consistent
          ? "That's a fairly tight, predictable cadence."
          : "That's a wider range than a perfectly regular schedule, so exact timing can shift from cycle to cycle."}
      </p>
    ),
  };
}

/** comparison's side-by-side data table — up to 3 peers (Magazine 3.0:
 * "TSLY vs MSTY vs CONY vs NVDY", not just one). Only rendered when at
 * least one real same-provider peer with fetched data exists
 * (getComparisonPeersData returning empty means no comparison page is
 * generated at all, see recipes.ts / quality.ts). */
export function comparisonTableSection(data: ArticleData, peers: ComparisonPeer[]): Section | null {
  if (peers.length === 0) return null;
  const { ticker, annualYieldPct, risk, payoutFrequency } = data;

  const columns = [
    { ticker, provider: data.etf.provider_id, yield: annualYieldPct, score: risk?.crady_score ?? null, riskLevel: risk?.risk_level ?? null, freq: payoutFrequency, self: true },
    ...peers.map((p) => ({ ticker: p.ticker, provider: p.provider_id, yield: p.annualYieldPct, score: p.cradyScore, riskLevel: p.riskLevel, freq: p.payoutFrequency, self: false })),
  ];

  const heading = peers.length === 1 ? `${ticker} vs ${peers[0].ticker}: Side-by-Side` : `${ticker} vs ${peers.map((p) => p.ticker).join(" vs ")}: Side-by-Side`;

  const bestYield = [...columns].filter((c) => c.yield != null).sort((a, b) => b.yield! - a.yield!)[0];
  const bestScore = [...columns].filter((c) => c.score != null).sort((a, b) => b.score! - a.score!)[0];

  const RISK_BADGE_VARIANT: Record<string, "green" | "blue" | "accent" | "red"> = {
    SAFE: "green",
    NORMAL: "blue",
    RISKY: "accent",
    EXTREME: "red",
  };

  return {
    id: "comparison-table",
    heading,
    body: (
      <div className="space-y-3">
        <KeyTakeaways
          heading="Key Takeaways"
          items={[
            ...(bestYield ? [`Highest estimated yield: ${bestYield.ticker} at ${fmtPct(bestYield.yield)}.`] : []),
            ...(bestScore ? [`Highest CRADY Score: ${bestScore.ticker} at ${bestScore.score!.toFixed(1)}/100.`] : []),
          ]}
        />
        <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Metric</th>
                {columns.map((c) => (
                  <th key={c.ticker} className="text-right px-4 py-2 font-medium whitespace-nowrap">{c.ticker}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-100)]">
              <tr className="hover:bg-[var(--gray-100)]/60 transition-colors">
                <td className="px-4 py-2.5 text-[var(--gray-500)]">Provider</td>
                {columns.map((c) => <td key={c.ticker} className="px-4 py-2.5 text-right font-semibold">{providerLabel(c.provider)}</td>)}
              </tr>
              <tr className="bg-[var(--gray-50)]/50 hover:bg-[var(--gray-100)]/60 transition-colors">
                <td className="px-4 py-2.5 text-[var(--gray-500)]">Est. Annualized Yield</td>
                {columns.map((c) => <td key={c.ticker} className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#92400e]">{fmtPct(c.yield)}</td>)}
              </tr>
              <tr className="hover:bg-[var(--gray-100)]/60 transition-colors">
                <td className="px-4 py-2.5 text-[var(--gray-500)]">CRADY Score</td>
                {columns.map((c) => <td key={c.ticker} className="px-4 py-2.5 text-right font-semibold tabular-nums">{c.score != null ? `${c.score.toFixed(1)}/100` : "—"}</td>)}
              </tr>
              <tr className="bg-[var(--gray-50)]/50 hover:bg-[var(--gray-100)]/60 transition-colors">
                <td className="px-4 py-2.5 text-[var(--gray-500)]">Risk Level</td>
                {columns.map((c) => (
                  <td key={c.ticker} className="px-4 py-2.5 text-right">
                    {c.riskLevel ? (
                      <Badge variant={RISK_BADGE_VARIANT[c.riskLevel] ?? "neutral"}>{RISK_LABEL[c.riskLevel] ?? c.riskLevel}</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-[var(--gray-100)]/60 transition-colors">
                <td className="px-4 py-2.5 text-[var(--gray-500)]">Payout Frequency</td>
                {columns.map((c) => <td key={c.ticker} className="px-4 py-2.5 text-right font-semibold capitalize">{c.freq ?? "—"}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  };
}

/** comparison's editorial takeaway — computed from whichever data is
 * actually available, not a fixed template sentence. With multiple peers,
 * names the single best-yield and best-score ticker across the whole set
 * rather than a pairwise verdict. */
export function comparisonVerdictSection(data: ArticleData, peers: ComparisonPeer[]): Section | null {
  const { ticker, annualYieldPct, risk } = data;
  if (peers.length === 0) return null;

  const yieldCandidates: [string, number][] = [
    ...(annualYieldPct != null ? [[ticker, annualYieldPct] as [string, number]] : []),
    ...peers.filter((p) => p.annualYieldPct != null).map((p) => [p.ticker, p.annualYieldPct!] as [string, number]),
  ];
  const scoreCandidates: [string, number][] = [
    ...(risk?.crady_score != null ? [[ticker, risk.crady_score] as [string, number]] : []),
    ...peers.filter((p) => p.cradyScore != null).map((p) => [p.ticker, p.cradyScore!] as [string, number]),
  ];

  if (yieldCandidates.length === 0 && scoreCandidates.length === 0) return null;

  const points: string[] = [];
  if (yieldCandidates.length > 1) {
    const [topTicker] = yieldCandidates.reduce((a, b) => (b[1] > a[1] ? b : a));
    points.push(`${topTicker} currently has the highest estimated yield of the group.`);
  }
  if (scoreCandidates.length > 1) {
    const [topTicker] = scoreCandidates.reduce((a, b) => (b[1] > a[1] ? b : a));
    points.push(`${topTicker} carries the strongest CRADY score of the group.`);
  }

  const peerNames = peers.map((p) => p.ticker).join(", ");
  const heading = peers.length === 1 ? `${ticker} or ${peers[0].ticker}: Which Should You Buy?` : `${ticker}, ${peerNames}: Which Should You Buy?`;

  return {
    id: "comparison-verdict",
    heading,
    body: (
      <p>
        {points.join(" ")} All funds shown are {providerLabel(data.etf.provider_id)} products in
        the same category, so the choice usually comes down to whether you prioritize a higher
        current yield or a more favorable risk profile — not personalized investment advice,
        consider your own goals and risk tolerance.
      </p>
    ),
  };
}

/** A 40-60 word, snippet-formatted lead paragraph — deliberately the FIRST
 * thing on the page (rendered before nextDividendHighlight, no heading),
 * written as a plain, self-contained answer for Google's featured-snippet
 * extraction rather than a stat grid. Rule-based from the same data the
 * highlight box uses; falls back to a factual "not enough data yet"
 * statement rather than fabricating a forecast. */
export function featuredSnippetSection(data: ArticleData): Section | null {
  const { ticker, prediction, annualYieldPct, payoutFrequency, latestPaidDistribution } = data;

  if (prediction?.target_pay_date && prediction.predicted_amount != null) {
    const timing = describeTiming(prediction.target_pay_date);
    return {
      id: "featured-snippet",
      heading: "",
      body: (
        <p className="text-[15px] sm:text-base leading-relaxed font-medium border-l-4 border-[var(--crady-accent)] pl-4">
          {ticker}&apos;s next dividend is expected {timing ? `${timing}, around` : "around"}{" "}
          {prediction.target_pay_date}, with an estimated payment of{" "}
          {fmtMoney(prediction.predicted_amount)} per share
          {payoutFrequency ? ` on its ${payoutFrequency} schedule` : ""}, based on{" "}
          {providerLabel(data.etf.provider_id)}&apos;s published dividend schedule and recent
          payment history.
          {prediction.confidence_score != null && (
            <> CRADY&apos;s prediction confidence is {fmtPct(prediction.confidence_score, 0)}.</>
          )}
          {annualYieldPct != null && (
            <> Its estimated annualized dividend yield is {fmtPct(annualYieldPct)}.</>
          )}
        </p>
      ),
    };
  }

  if (latestPaidDistribution?.amount != null) {
    return {
      id: "featured-snippet",
      heading: "",
      body: (
        <p className="text-[15px] sm:text-base leading-relaxed font-medium border-l-4 border-[var(--crady-accent)] pl-4">
          {ticker} is a{payoutFrequency ? ` ${payoutFrequency}` : ""} dividend ETF
          {annualYieldPct != null && <> with an estimated annualized yield of {fmtPct(annualYieldPct)}</>}.
          Its most recent payment was {fmtMoney(latestPaidDistribution.amount)} per share on{" "}
          {latestPaidDistribution.pay_date}. CRADY doesn&apos;t have enough recent data yet for a
          reliable next-dividend forecast.
        </p>
      ),
    };
  }

  return null;
}

/** SEO Authority Phase 2, Magazine hero improvement: a richer top-of-page
 * block for the two flagship article types (next-dividend-prediction,
 * dividend-guide) — "Why it matters" / "3 Key Insights" / "Investor
 * Takeaway" / "TL;DR", all rule-based from data already fetched for this
 * page. Additive to the section list, inserted right after
 * featuredSnippetSection — that section's own id/empty-heading contract is
 * untouched, this is a new id with its own visible heading. */
export function articleHeroInsightsSection(data: ArticleData): Section | null {
  const { ticker, risk, annualYieldPct, prediction, latestPaidDistribution } = data;
  if (risk?.crady_score == null && annualYieldPct == null) return null;

  const yieldTier =
    annualYieldPct == null ? null : annualYieldPct >= 50 ? "very high" : annualYieldPct >= 20 ? "high" : "moderate";
  const riskLabel = risk?.risk_level ? (RISK_LABEL[risk.risk_level] ?? risk.risk_level) : null;

  const insights: string[] = [];
  if (yieldTier && annualYieldPct != null) {
    insights.push(`Estimated annualized yield of ${fmtPct(annualYieldPct)} — a ${yieldTier}-yield tier fund.`);
  }
  if (riskLabel && risk?.crady_score != null) {
    insights.push(`CRADY Score of ${risk.crady_score.toFixed(1)}/100, classified as ${riskLabel.toLowerCase()} risk.`);
  }
  if (prediction?.confidence_score != null) {
    insights.push(`Next-dividend prediction confidence: ${formatConfidencePct(prediction.confidence_score, 0)}.`);
  } else {
    insights.push("No confident next-dividend prediction available yet.");
  }

  const whyItMatters =
    annualYieldPct != null
      ? `${ticker}'s yield tier and risk classification together determine how much of its distribution is likely sustainable income versus volatility-driven payout.`
      : `${ticker}'s risk classification is the main factor income-focused investors should weigh before comparing it on yield alone.`;

  const investorTakeaway =
    prediction?.predicted_amount != null
      ? `Investors tracking ${ticker} typically watch both the next predicted payment and the fund's risk trend together, not yield in isolation.`
      : `Investors considering ${ticker} typically wait for a confirmed payment history before relying on any yield projection.`;

  const tldr =
    latestPaidDistribution?.amount != null
      ? `${ticker} last paid $${latestPaidDistribution.amount.toFixed(4)} per share; CRADY Score ${
          risk?.crady_score != null ? risk.crady_score.toFixed(1) : "—"
        }/100.`
      : `${ticker} CRADY Score: ${risk?.crady_score != null ? risk.crady_score.toFixed(1) : "—"}/100.`;

  return {
    id: "article-hero-insights",
    heading: "Why It Matters",
    body: (
      <div className="space-y-4">
        <p>{whyItMatters}</p>
        <KeyTakeaways heading="3 Key Insights" items={insights} />
        <p className="text-sm text-[var(--gray-600)]">
          <strong className="text-[var(--gray-800)]">Investor Takeaway:</strong> {investorTakeaway}
        </p>
        <p className="text-xs text-[var(--gray-500)] border-t border-[var(--gray-200)] pt-3">
          <strong>TL;DR:</strong> {tldr}
        </p>
      </div>
    ),
  };
}

/** A compact "Quick Facts" strip — Web UX/SEO Phase 2, Part 2: every
 * article type gets the same five-glance answer (frequency, next payment,
 * current yield, risk, prediction confidence) right under its snippet
 * lead, before the reader has to read any prose or table. Deliberately
 * terse (one line of KPI cards, no explanation) — the sections below each
 * page already go deep on whichever of these facts is that page's own
 * focus, so this never substitutes for them, only orients the reader
 * before they get there. */
export function quickFactsSection(data: ArticleData): Section | null {
  const { ticker, payoutFrequency, prediction, annualYieldPct, risk } = data;
  const items: KpiItem[] = [];
  if (payoutFrequency) {
    items.push({ label: "Dividend Frequency", value: payoutFrequency });
  }
  if (prediction?.target_pay_date) {
    items.push({ label: "Next Payment", value: prediction.target_pay_date });
  }
  if (annualYieldPct != null) {
    items.push({ label: "Current Yield", value: fmtPct(annualYieldPct), accent: true });
  }
  if (risk?.risk_level) {
    items.push({ label: "Risk", value: RISK_LABEL[risk.risk_level] ?? risk.risk_level });
  }
  if (prediction?.confidence_score != null) {
    items.push({ label: "Prediction Confidence", value: fmtPct(prediction.confidence_score, 0) });
  }
  if (items.length < 2) return null;

  return {
    id: "quick-facts",
    heading: `${ticker} Quick Facts`,
    body: (
      <div className="not-prose">
        <KpiGrid items={items} columns={items.length >= 4 ? 4 : 3} />
      </div>
    ),
  };
}

/** Same snippet-lead pattern as featuredSnippetSection, adapted for
 * dividend-guide's own core question ("what is this ETF and what does it
 * yield") — AI Overview Optimization Phase 1: every article type gets a
 * self-contained, 40-70 word answer as the first thing on the page, not
 * just the flagship next-dividend-prediction type. */
export function dividendGuideSnippetSection(data: ArticleData): Section | null {
  const { ticker, annualYieldPct, payoutFrequency, etf } = data;
  if (annualYieldPct == null && !payoutFrequency) return null;

  return {
    id: "featured-snippet",
    heading: "",
    body: (
      <p className="text-[15px] sm:text-base leading-relaxed font-medium border-l-4 border-[var(--crady-accent)] pl-4">
        {ticker} is a {providerLabel(etf.provider_id)}
        {payoutFrequency ? ` ${payoutFrequency}` : ""} dividend ETF
        {etf.category && etf.category.toLowerCase() !== "unknown" ? ` in the ${etf.category} category` : ""}.
        {annualYieldPct != null && (
          <>
            {" "}
            Its estimated annualized distribution yield is {fmtPct(annualYieldPct)}, based on the
            trailing 90-day actual payment run-rate rather than a projected figure.
          </>
        )}
        {payoutFrequency && (
          <> {ticker} pays distributions on a {payoutFrequency} schedule.</>
        )}
      </p>
    ),
  };
}

/** dividend-calendar's snippet lead — the core question is "when does this
 * ETF pay next," so the lead states the next scheduled ex-date/pay-date (or
 * honestly says none is published yet) rather than repeating the yield. */
export function dividendCalendarSnippetSection(data: ArticleData): Section | null {
  const { ticker, futureSchedule, payoutFrequency, etf } = data;
  const next = futureSchedule[0];

  return {
    id: "featured-snippet",
    heading: "",
    body: (
      <p className="text-[15px] sm:text-base leading-relaxed font-medium border-l-4 border-[var(--crady-accent)] pl-4">
        {next ? (
          <>
            {ticker}&apos;s next scheduled ex-dividend date is {next.ex_date}, with payment on{" "}
            {next.pay_date}, based on {providerLabel(etf.provider_id)}&apos;s published dividend
            calendar.
          </>
        ) : (
          <>
            {providerLabel(etf.provider_id)} hasn&apos;t published {ticker}&apos;s forward payment
            schedule yet.
          </>
        )}
        {payoutFrequency && <> {ticker} pays on a {payoutFrequency} schedule.</>}
      </p>
    ),
  };
}

/** dividend-history's snippet lead — the core question is "how much has
 * this ETF paid historically," answered with real aggregate numbers over
 * the same distributionsExtended window yearlyBreakdownSection uses. */
export function dividendHistorySnippetSection(data: ArticleData): Section | null {
  const { ticker, distributionsExtended } = data;
  const paid = distributionsExtended.filter((d) => d.amount != null);
  if (paid.length === 0) return null;

  const total = paid.reduce((a, d) => a + d.amount!, 0);
  const avg = total / paid.length;
  const oldestDate = paid[paid.length - 1].pay_date;
  const newestDate = paid[0].pay_date;

  return {
    id: "featured-snippet",
    heading: "",
    body: (
      <p className="text-[15px] sm:text-base leading-relaxed font-medium border-l-4 border-[var(--crady-accent)] pl-4">
        CRADY has recorded {paid.length} {ticker} distribution{paid.length === 1 ? "" : "s"} from{" "}
        {oldestDate} to {newestDate}, totaling {fmtMoney(total, 2)} per share and averaging{" "}
        {fmtMoney(avg)} per payment. Option-income ETFs like {ticker} typically fluctuate with
        underlying volatility rather than growing steadily like a traditional dividend stock.
      </p>
    ),
  };
}

/** risk-analysis's snippet lead — the core question is "is this ETF risky
 * and why," answered with the CRADY Score and the two inputs that actually
 * drive it, matching riskAnalysisSection's own numbers exactly (never a
 * second, independently-computed figure that could drift from it). */
export function riskAnalysisSnippetSection(data: ArticleData): Section | null {
  const { ticker, risk } = data;
  if (!risk?.risk_level || risk.crady_score == null) return null;

  return {
    id: "featured-snippet",
    heading: "",
    body: (
      <p className="text-[15px] sm:text-base leading-relaxed font-medium border-l-4 border-[var(--crady-accent)] pl-4">
        CRADY classifies {ticker} as {RISK_LABEL[risk.risk_level]?.toLowerCase() ?? risk.risk_level.toLowerCase()} risk,
        with a CRADY Score of {risk.crady_score.toFixed(1)}/100.
        {risk.volatility_30d != null && <> Its 30-day volatility is {fmtPct(risk.volatility_30d)}</>}
        {risk.dividend_stability_score != null && (
          <>
            {risk.volatility_30d != null ? ", and" : " Its"} dividend stability score is{" "}
            {risk.dividend_stability_score.toFixed(1)}/100
          </>
        )}
        . A high yield alone doesn&apos;t raise this score — volatility and irregular payments
        lower it by design.
      </p>
    ),
  };
}

/** comparison's snippet lead — the core question is "X vs Y, which is
 * better," answered with the same yield/score numbers the comparison table
 * below shows, never a separate verdict computed differently. */
export function comparisonSnippetSection(data: ArticleData, peers: ComparisonPeer[]): Section | null {
  if (peers.length === 0) return null;
  const { ticker, annualYieldPct, risk, etf } = data;
  const peerLabel = peers.map((p) => p.ticker).join(", ");

  return {
    id: "featured-snippet",
    heading: "",
    body: (
      <p className="text-[15px] sm:text-base leading-relaxed font-medium border-l-4 border-[var(--crady-accent)] pl-4">
        {ticker} and {peerLabel} are {providerLabel(etf.provider_id)} covered-call ETFs.
        {annualYieldPct != null && peers[0].annualYieldPct != null && (
          <>
            {" "}
            {ticker}&apos;s estimated annualized yield is {fmtPct(annualYieldPct)}, versus{" "}
            {fmtPct(peers[0].annualYieldPct)} for {peers[0].ticker}.
          </>
        )}
        {risk?.crady_score != null && peers[0].cradyScore != null && (
          <>
            {" "}
            CRADY Score: {risk.crady_score.toFixed(1)} vs {peers[0].cradyScore.toFixed(1)}.
          </>
        )}{" "}
        See the full side-by-side below for risk level and payout frequency.
      </p>
    ),
  };
}

type TimelineStage = { label: string; date: string; estimated?: boolean };

function Timeline({ title, stages }: { title: string; stages: TimelineStage[] }) {
  if (stages.length === 0) return null;
  return (
    <div className="not-prose">
      <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">
        {title}
      </div>
      <div className="flex items-start">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center text-center min-w-[90px]">
              <div
                className={`w-3 h-3 rounded-full ${stage.estimated ? "bg-[var(--gray-300)] border-2 border-[var(--gray-400)]" : "bg-[var(--crady-accent)]"}`}
              />
              <div className="mt-2 text-xs font-semibold">{stage.label}</div>
              <div className="text-xs text-[var(--gray-500)]">{stage.date}</div>
              {stage.estimated && <div className="text-[10px] text-[var(--gray-400)]">estimated</div>}
            </div>
            {i < stages.length - 1 && (
              <div className="flex-1 h-px bg-[var(--gray-200)] mt-1.5 mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Announcement → Ex-Dividend → Payment, for both the most recent actual
 * payment and the next predicted one. No "Record Date" stage — CRADY's
 * schema doesn't track it (only declaration_date/ex_date/pay_date), and a
 * guessed record date (commonly ex-date +1 under T+1 settlement, but not
 * universal) isn't something to state as fact without real data behind it. */
export function dividendTimelineSection(data: ArticleData): Section | null {
  const { ticker, latestPaidDistribution, prediction } = data;

  const recentStages: TimelineStage[] = [];
  if (latestPaidDistribution) {
    if (latestPaidDistribution.declaration_date) {
      recentStages.push({ label: "Announced", date: latestPaidDistribution.declaration_date });
    }
    recentStages.push({ label: "Ex-Dividend", date: latestPaidDistribution.ex_date });
    recentStages.push({ label: "Payment", date: latestPaidDistribution.pay_date });
  }

  const nextStages: TimelineStage[] = [];
  if (prediction?.target_ex_date) {
    nextStages.push({ label: "Ex-Dividend", date: prediction.target_ex_date, estimated: true });
  }
  if (prediction?.target_pay_date) {
    nextStages.push({ label: "Payment", date: prediction.target_pay_date, estimated: true });
  }

  if (recentStages.length === 0 && nextStages.length === 0) return null;

  return {
    id: "dividend-timeline",
    heading: `${ticker} Dividend Timeline`,
    body: (
      <div className="space-y-6">
        {nextStages.length > 0 && <Timeline title="Next Predicted Payment" stages={nextStages} />}
        {recentStages.length > 0 && <Timeline title="Most Recent Payment" stages={recentStages} />}
      </div>
    ),
  };
}

/** 3/6/12-month trailing payment-momentum table — distinct granularity and
 * purpose from dividend-history's year-by-year breakdown (that page looks
 * back across the fund's full record; this looks at short/medium-term
 * momentum specifically to contextualize the next-payment forecast). */
export function dividendTrendSection(data: ArticleData): Section | null {
  const { ticker, trend } = data;
  const withData = trend.filter((w) => w.count > 0);
  if (withData.length === 0) return null;

  return {
    id: "dividend-trend",
    heading: `${ticker} Dividend Trend`,
    body: (
      <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Window</th>
              <th className="text-right px-4 py-2.5 font-medium">Payments</th>
              <th className="text-right px-4 py-2.5 font-medium">Average</th>
              <th className="text-right px-4 py-2.5 font-medium">High</th>
              <th className="text-right px-4 py-2.5 font-medium">Low</th>
              <th className="text-right px-4 py-2.5 font-medium">Up / Down</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gray-100)]">
            {trend.map((w, i) => (
              <tr
                key={w.days}
                className={`hover:bg-[var(--gray-100)]/60 transition-colors ${i % 2 === 1 ? "bg-[var(--gray-50)]/50" : ""}`}
              >
                <td className="px-4 py-2.5 font-medium">{w.label}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{w.count}</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmtMoney(w.avg)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(w.max)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtMoney(w.min)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {w.count > 0 ? (
                    <>
                      <span className="text-emerald-700 font-semibold">{w.increases}↑</span>
                      {" / "}
                      <span className="text-red-700 font-semibold">{w.decreases}↓</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  };
}

function trendDescriptor(window: TrendWindow | undefined): string {
  if (!window || window.avgChangePct == null) return "a relatively stable pattern";
  if (window.avgChangePct >= 2) return "a gradual upward trend";
  if (window.avgChangePct <= -2) return "a gradual downward trend";
  return "a relatively stable pattern";
}

/** Rule-based narrative summary — template logic over already-computed
 * fields (trend windows + prediction), NOT an LLM call, per the Magazine
 * 3.0 spec. The one place on the page where several query phrasings
 * (dividend, payment, forecast, schedule) appear together naturally, since
 * it's synthesizing a real computed conclusion rather than listing terms. */
export function aiSummarySection(data: ArticleData): Section | null {
  const { ticker, trend, prediction, latestPaidDistribution, payoutFrequency } = data;
  const sixMo = trend.find((w) => w.days === 180);
  if (!sixMo || sixMo.count === 0) return null;

  const timing = describeTiming(prediction?.target_pay_date);
  const monthYear = monthYearLabel(prediction?.target_pay_date);

  return {
    id: "ai-summary",
    heading: `${ticker} Dividend Summary`,
    body: (
      <p>
        Over the last 6 months, {ticker} has made {sixMo.count} payment{sixMo.count === 1 ? "" : "s"},
        averaging {fmtMoney(sixMo.avg)} per share with {sixMo.increases} increase
        {sixMo.increases === 1 ? "" : "s"} and {sixMo.decreases} decrease{sixMo.decreases === 1 ? "" : "s"}{" "}
        — {trendDescriptor(sixMo)}.{" "}
        {latestPaidDistribution?.amount != null && (
          <>Its most recent payment was {fmtMoney(latestPaidDistribution.amount)} on {latestPaidDistribution.pay_date}. </>
        )}
        {prediction?.target_pay_date && prediction.predicted_amount != null ? (
          <>
            Based on this pattern{payoutFrequency ? ` and its ${payoutFrequency} schedule` : ""}, CRADY&apos;s{" "}
            {ticker} dividend forecast{monthYear ? ` for ${monthYear}` : ""} is{" "}
            {fmtMoney(prediction.predicted_amount)}, expected{timing ? ` ${timing}` : ""} (
            {prediction.target_pay_date})
            {prediction.confidence_score != null && <> with {fmtPct(prediction.confidence_score, 0)} confidence</>}.
          </>
        ) : (
          <>CRADY doesn&apos;t have enough data yet for a reliable next-dividend forecast.</>
        )}
      </p>
    ),
  };
}

export function aiSummarySectionKo(data: ArticleData): Section | null {
  const { ticker, trend, prediction, payoutFrequency, annualYieldPct } = data;
  const sixMo = trend.find((w) => w.days === 180);
  if (!sixMo || sixMo.count === 0) return null;

  const timing = describeTimingKo(prediction?.target_pay_date);
  const monthYearKo = monthYearLabelKo(prediction?.target_pay_date);
  const freqKo = payoutFrequency === "weekly" ? "주간" : payoutFrequency === "monthly" ? "월간" : payoutFrequency;
  const trendKo =
    sixMo.avgChangePct == null
      ? "비교적 안정적인 흐름을"
      : sixMo.avgChangePct >= 2
        ? "완만한 상승 추세를"
        : sixMo.avgChangePct <= -2
          ? "완만한 하락 추세를"
          : "비교적 안정적인 흐름을";

  return {
    id: "ai-summary-ko",
    heading: `${ticker} 배당 요약`,
    body: (
      <p>
        최근 6개월간 {ticker}는 {sixMo.count}회 배당을 지급했으며, 평균 {fmtMoney(sixMo.avg)}로{" "}
        {trendKo} 보이고 있습니다 (상승 {sixMo.increases}회, 하락 {sixMo.decreases}회).{" "}
        {annualYieldPct != null && (
          <>{ticker}의 예상 연환산 배당 수익률(배당률)은 약 {fmtPct(annualYieldPct)}입니다. </>
        )}
        {prediction?.target_pay_date && prediction.predicted_amount != null ? (
          <>
            {freqKo ? `${freqKo} 지급 주기를 반영해` : ""} CRADY는 {ticker}
            {monthYearKo ? ` ${monthYearKo}` : ""} 배당을{" "}
            {fmtMoney(prediction.predicted_amount)}
            {timing ? `, ${timing}` : ""}({prediction.target_pay_date}) 지급될 것으로 예상합니다
            {prediction.confidence_score != null && ` (신뢰도 ${fmtPct(prediction.confidence_score, 0)})`}.
          </>
        ) : (
          <>다음 배당을 예측할 만큼 충분한 데이터가 아직 없습니다.</>
        )}
      </p>
    ),
  };
}

/** A condensed multi-peer teaser (not the full comparison table) — links
 * out to the full 1-on-1 comparison page rather than duplicating its
 * table, so the two pages stay distinct (this is 2-3 rows of quick
 * context; the comparison page is the full side-by-side breakdown). */
export function quickCompareSection(data: ArticleData, peers: ComparisonPeer[]): Section | null {
  if (peers.length === 0) return null;
  const { ticker, annualYieldPct, risk } = data;

  return {
    id: "quick-compare",
    heading: `How Does ${ticker} Compare?`,
    body: (
      <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Ticker</th>
              <th className="text-right px-4 py-2.5 font-medium">Est. Yield</th>
              <th className="text-right px-4 py-2.5 font-medium">CRADY Score</th>
              <th className="text-right px-4 py-2.5 font-medium">Frequency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gray-100)]">
            <tr className="bg-[var(--crady-accent)]/10 hover:bg-[var(--crady-accent)]/15 transition-colors">
              <td className="px-4 py-2.5 font-semibold">{ticker}</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#92400e]">{fmtPct(annualYieldPct)}</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{risk?.crady_score != null ? risk.crady_score.toFixed(1) : "—"}</td>
              <td className="px-4 py-2.5 text-right capitalize">{data.payoutFrequency ?? "—"}</td>
            </tr>
            {peers.map((peer, i) => (
              <tr
                key={peer.ticker}
                className={`hover:bg-[var(--gray-100)]/60 transition-colors ${i % 2 === 1 ? "bg-[var(--gray-50)]/50" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <Link href={`/magazine/${peer.ticker.toLowerCase()}-next-dividend-prediction`} className="font-medium hover:underline">
                    {peer.ticker}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtPct(peer.annualYieldPct)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{peer.cradyScore != null ? peer.cradyScore.toFixed(1) : "—"}</td>
                <td className="px-4 py-2.5 text-right capitalize">{peer.payoutFrequency ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 bg-[var(--gray-50)] text-xs">
          <Link href={`/magazine/${ticker.toLowerCase()}-comparison`} className="underline hover:text-black">
            See the full {ticker} comparison →
          </Link>
        </div>
      </div>
    ),
  };
}

export function faqSectionKo(items: FaqItem[]): Section | null {
  if (items.length === 0) return null;
  return {
    id: "faq-ko",
    heading: "자주 묻는 질문",
    body: (
      <div className="not-prose divide-y divide-[var(--gray-100)]">
        {items.map((item) => (
          <div key={item.question} className="py-4 first:pt-0">
            <div className="font-semibold text-sm">{item.question}</div>
            <p className="mt-1.5 text-sm text-[var(--gray-600)]">{item.answer}</p>
          </div>
        ))}
      </div>
    ),
  };
}

