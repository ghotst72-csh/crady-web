import Link from "next/link";
import { providerLabel, type ComparisonPeer } from "@/lib/data";
import { DividendStagePill } from "@/components/DividendLifecycle";
import type { ArticleData } from "./data";
import type { FaqItem, Section } from "./types";

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
  return {
    id: "distribution-history",
    heading: `${ticker} Distribution History`,
    body: (
      <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Ex-Date</th>
              <th className="text-left px-4 py-2 font-medium">Pay Date</th>
              <th className="text-right px-4 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gray-100)]">
            {distributions.map((d, i) => (
              <tr key={`${d.ex_date}-${i}`}>
                <td className="px-4 py-2">{d.ex_date}</td>
                <td className="px-4 py-2">{d.pay_date}</td>
                <td className="px-4 py-2 text-right font-medium">{fmtMoney(d.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  return {
    id: "risk-analysis",
    heading: `${ticker} Risk Analysis`,
    body: (
      <ul>
        {risk.crady_score != null && (
          <li>
            CRADY Score: <strong>{risk.crady_score.toFixed(1)}</strong> / 100
          </li>
        )}
        {risk.risk_level && (
          <li>
            Risk level: <strong>{RISK_LABEL[risk.risk_level] ?? risk.risk_level}</strong>
          </li>
        )}
        {risk.volatility_30d != null && (
          <li>
            30-day volatility: <strong>{fmtPct(risk.volatility_30d)}</strong>
          </li>
        )}
        {risk.max_drawdown != null && (
          <li>
            Max drawdown: <strong>{fmtPct(risk.max_drawdown)}</strong>
          </li>
        )}
      </ul>
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
          <table className="w-full text-sm">
            <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Ex-Dividend Date</th>
                <th className="text-left px-4 py-2 font-medium">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-100)]">
              {futureSchedule.map((s, i) => (
                <tr key={`${s.ex_date}-${i}`}>
                  <td className="px-4 py-2">{s.ex_date}</td>
                  <td className="px-4 py-2">{s.pay_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

  return {
    id: "yearly-breakdown",
    heading: `${ticker} Dividend History by Year`,
    body: (
      <div>
        <p>
          Across {paid.length} recorded payments, {ticker} has paid a combined{" "}
          <strong>${lifetimeTotal.toFixed(2)}</strong> per share on CRADY&apos;s record.
        </p>
        <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Year</th>
                <th className="text-right px-4 py-2 font-medium">Payments</th>
                <th className="text-right px-4 py-2 font-medium">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-100)]">
              {years.map(([year, bucket]) => (
                <tr key={year}>
                  <td className="px-4 py-2">{year}</td>
                  <td className="px-4 py-2 text-right">{bucket.count}</td>
                  <td className="px-4 py-2 text-right font-medium">${bucket.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

/** comparison's side-by-side data table — only rendered when a real
 * same-provider peer with fetched data exists (getComparisonPeerData
 * returning null means no comparison page is generated at all, see
 * recipes.ts / quality.ts). */
export function comparisonTableSection(data: ArticleData, peer: ComparisonPeer): Section | null {
  const { ticker, annualYieldPct, risk, payoutFrequency } = data;

  const rows: [string, string, string][] = [
    ["Provider", providerLabel(data.etf.provider_id), providerLabel(peer.provider_id)],
    ["Est. Annualized Yield", fmtPct(annualYieldPct), fmtPct(peer.annualYieldPct)],
    ["CRADY Score", risk?.crady_score != null ? `${risk.crady_score.toFixed(1)}/100` : "—", peer.cradyScore != null ? `${peer.cradyScore.toFixed(1)}/100` : "—"],
    ["Risk Level", risk?.risk_level ? (RISK_LABEL[risk.risk_level] ?? risk.risk_level) : "—", peer.riskLevel ? (RISK_LABEL[peer.riskLevel] ?? peer.riskLevel) : "—"],
    ["Payout Frequency", payoutFrequency ?? "—", peer.payoutFrequency ?? "—"],
  ];

  return {
    id: "comparison-table",
    heading: `${ticker} vs ${peer.ticker}: Side-by-Side`,
    body: (
      <div className="not-prose border border-[var(--gray-200)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Metric</th>
              <th className="text-right px-4 py-2 font-medium">{ticker}</th>
              <th className="text-right px-4 py-2 font-medium">{peer.ticker}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gray-100)]">
            {rows.map(([label, a, b]) => (
              <tr key={label}>
                <td className="px-4 py-2 text-[var(--gray-500)]">{label}</td>
                <td className="px-4 py-2 text-right font-medium">{a}</td>
                <td className="px-4 py-2 text-right font-medium">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  };
}

/** comparison's editorial takeaway — computed from whichever data is
 * actually available for both sides, not a fixed template sentence. */
export function comparisonVerdictSection(data: ArticleData, peer: ComparisonPeer): Section | null {
  const { ticker, annualYieldPct, risk } = data;
  if (annualYieldPct == null && peer.annualYieldPct == null) return null;

  const points: string[] = [];
  if (annualYieldPct != null && peer.annualYieldPct != null) {
    const higher = annualYieldPct > peer.annualYieldPct ? ticker : peer.ticker;
    const diff = Math.abs(annualYieldPct - peer.annualYieldPct);
    points.push(
      `${higher} currently has the higher estimated yield, by about ${diff.toFixed(1)} percentage points.`
    );
  }
  if (risk?.crady_score != null && peer.cradyScore != null) {
    const better = risk.crady_score > peer.cradyScore ? ticker : peer.ticker;
    points.push(`${better} carries the stronger CRADY score of the two.`);
  }

  return {
    id: "comparison-verdict",
    heading: `${ticker} or ${peer.ticker}: Which Should You Buy?`,
    body: (
      <p>
        {points.join(" ")} Both funds are {providerLabel(data.etf.provider_id)} products in the
        same category, so the choice usually comes down to whether you prioritize a higher
        current yield or a more favorable risk profile — not personalized investment advice,
        consider your own goals and risk tolerance.
      </p>
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

export function relatedLinksSection(data: ArticleData, links: { href: string; label: string }[]): Section | null {
  if (links.length === 0) return null;
  return {
    id: "related-links",
    heading: "Related Reading",
    body: (
      <div className="not-prose flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    ),
  };
}
