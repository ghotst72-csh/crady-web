"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { TickerAutocompleteInput } from "@/components/portfolio/TickerAutocompleteInput";
import type { SearchEntry } from "@/lib/search/searchTickers";
import { calculateEtfProjection, type CalculatorInputs } from "@/lib/etfCalculator/calculations";
import { getRealEtfStats, type RealEtfStats } from "@/lib/etfCalculator/realEtfStats";
import { providerLabel } from "@/lib/providers";
import { GrowthChart } from "./GrowthChart";

const DEFAULTS = {
  initialInvestment: "10000",
  monthlyInvestment: "500",
  years: "20",
  expectedAnnualReturnPct: "8",
  annualFeePct: "0.15",
  distributionYieldPct: "0",
};

function fmtUsd(n: number, digits = 0): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function fmtPct(n: number, digits = 2): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function toNumber(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

export function EtfCalculator({ searchIndex }: { searchIndex: SearchEntry[] }) {
  const [initialInvestment, setInitialInvestment] = useState(DEFAULTS.initialInvestment);
  const [monthlyInvestment, setMonthlyInvestment] = useState(DEFAULTS.monthlyInvestment);
  const [years, setYears] = useState(DEFAULTS.years);
  const [expectedAnnualReturnPct, setExpectedAnnualReturnPct] = useState(DEFAULTS.expectedAnnualReturnPct);
  const [annualFeePct, setAnnualFeePct] = useState(DEFAULTS.annualFeePct);
  const [distributionYieldPct, setDistributionYieldPct] = useState(DEFAULTS.distributionYieldPct);
  const [reinvestDistributions, setReinvestDistributions] = useState(true);

  const [tickerQuery, setTickerQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [etfStats, setEtfStats] = useState<RealEtfStats | null>(null);
  const [isPending, startTransition] = useTransition();

  const resultsRef = useRef<HTMLDivElement>(null);

  const inputs: Partial<CalculatorInputs> = {
    initialInvestment: toNumber(initialInvestment),
    monthlyInvestment: toNumber(monthlyInvestment),
    years: toNumber(years),
    expectedAnnualReturnPct: toNumber(expectedAnnualReturnPct),
    annualFeePct: toNumber(annualFeePct),
    distributionYieldPct: toNumber(distributionYieldPct),
    reinvestDistributions,
  };

  // Recomputed on every keystroke — cheap, pure, client-side, no reload.
  // Deliberately listing primitive fields, not `inputs` itself: that object
  // literal is a fresh reference every render, which would defeat the memo
  // entirely (recompute on every render, not just on an actual value change).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => calculateEtfProjection(inputs), [
    inputs.initialInvestment,
    inputs.monthlyInvestment,
    inputs.years,
    inputs.expectedAnnualReturnPct,
    inputs.annualFeePct,
    inputs.distributionYieldPct,
    inputs.reinvestDistributions,
  ]);

  function handleSelectTicker(ticker: string) {
    setSelectedTicker(ticker);
    setTickerQuery(ticker);
    setEtfStats(null);
    const snapshot = searchIndex.find((e) => e.ticker === ticker) ?? null;
    startTransition(async () => {
      const stats = await getRealEtfStats(ticker, snapshot);
      setEtfStats(stats);
      if (stats) {
        if (stats.trailingTotalReturnPct != null) setExpectedAnnualReturnPct(stats.trailingTotalReturnPct.toFixed(2));
        if (stats.expenseRatioPct != null) setAnnualFeePct(stats.expenseRatioPct.toFixed(2));
        if (stats.distributionYieldPct != null) setDistributionYieldPct(stats.distributionYieldPct.toFixed(2));
      }
    });
  }

  function clearTicker() {
    setSelectedTicker(null);
    setEtfStats(null);
    setTickerQuery("");
  }

  function handleReset() {
    setInitialInvestment(DEFAULTS.initialInvestment);
    setMonthlyInvestment(DEFAULTS.monthlyInvestment);
    setYears(DEFAULTS.years);
    setExpectedAnnualReturnPct(DEFAULTS.expectedAnnualReturnPct);
    setAnnualFeePct(DEFAULTS.annualFeePct);
    setDistributionYieldPct(DEFAULTS.distributionYieldPct);
    setReinvestDistributions(true);
    clearTicker();
  }

  function handleCalculateClick() {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      {/* ---- Calculate with a Real ETF ---- */}
      <div className="border border-[var(--gray-200)] rounded-xl p-4 sm:p-5 mb-5">
        <div className="text-sm font-bold text-[var(--gray-900)]">Calculate with a Real ETF</div>
        <p className="mt-1 text-xs text-[var(--gray-500)]">
          Optional. Search a ticker CRADY tracks to prefill the return, fee, and yield fields below with real data —
          fields with no reliable data stay exactly as you set them.
        </p>
        <div className="mt-3 max-w-sm">
          <TickerAutocompleteInput
            index={searchIndex}
            value={tickerQuery}
            onChange={setTickerQuery}
            onSelect={handleSelectTicker}
            placeholder="Search ticker, e.g. TSLY, MSTY..."
          />
        </div>
        {selectedTicker && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span className="font-bold text-sm">{selectedTicker}</span>
            {isPending ? (
              <span className="text-[var(--gray-400)]">Loading real data…</span>
            ) : etfStats ? (
              <>
                {etfStats.name && <span className="text-[var(--gray-500)]">{etfStats.name}</span>}
                <span className="text-[var(--gray-500)]">{providerLabel(etfStats.providerId)}</span>
                {etfStats.currentPrice != null && (
                  <span className="text-[var(--gray-600)]">
                    Current price: <b>{fmtUsd(etfStats.currentPrice, 2)}</b>
                  </span>
                )}
                {etfStats.trailingTotalReturnPct != null ? (
                  <span className="text-[var(--gray-600)]">
                    Trailing 12mo return: <b>{fmtPct(etfStats.trailingTotalReturnPct)}</b>
                  </span>
                ) : (
                  <span className="text-[var(--gray-400)]">
                    Trailing return unavailable{etfStats.trailingReturnUnavailableReason === "split-anomaly" ? " (price anomaly detected)" : " (not enough history)"}
                  </span>
                )}
                {etfStats.distributionYieldPct != null && (
                  <span className="text-[var(--gray-600)]">
                    Distribution yield: <b>{etfStats.distributionYieldPct.toFixed(2)}%</b>
                  </span>
                )}
                {etfStats.expenseRatioPct != null && (
                  <span className="text-[var(--gray-600)]">
                    Expense ratio: <b>{etfStats.expenseRatioPct.toFixed(2)}%</b>
                  </span>
                )}
              </>
            ) : null}
            <button type="button" onClick={clearTicker} className="text-[var(--gray-400)] hover:text-black underline">
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---- Input panel ---- */}
        <div className="border border-[var(--gray-200)] rounded-xl p-4 sm:p-5">
          <div className="text-sm font-bold text-[var(--gray-900)] mb-4">1. Input Your Investment</div>

          <div className="space-y-4">
            <NumberField label="Initial Investment" hint="The amount you plan to invest initially." unit="USD" value={initialInvestment} onChange={setInitialInvestment} />
            <NumberField label="Monthly Investment" hint="Additional amount invested each month." unit="USD" value={monthlyInvestment} onChange={setMonthlyInvestment} />
            <NumberField label="Investment Period" hint="How long do you plan to invest?" unit="Years" value={years} onChange={setYears} />
            <NumberField label="Expected Annual Return (Average)" hint="Total return assumption — price change plus distributions." unit="%" value={expectedAnnualReturnPct} onChange={setExpectedAnnualReturnPct} allowNegative />
            <NumberField label="Annual Fee (Expense Ratio, etc.)" hint="Total annual fees of the ETF." unit="%" value={annualFeePct} onChange={setAnnualFeePct} />
            <NumberField label="Assumed Distribution Yield" hint="Portion of the return above assumed to arrive as cash distributions, not price growth." unit="%" value={distributionYieldPct} onChange={setDistributionYieldPct} />

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--gray-800)]">Reinvest Distributions</label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={reinvestDistributions}
                  onClick={() => setReinvestDistributions((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${reinvestDistributions ? "bg-black" : "bg-[var(--gray-200)]"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${reinvestDistributions ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <p className="mt-1 text-xs text-[var(--gray-500)]">
                {reinvestDistributions
                  ? "ON — distributions buy more shares and compound into the portfolio value."
                  : "OFF — distributions are paid out as cash and tracked separately from portfolio value."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleCalculateClick}
              className="flex-1 px-4 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-[var(--gray-800)] transition-colors"
            >
              Calculate
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-lg border border-[var(--gray-300)] text-sm font-semibold hover:border-black transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* ---- Results panel ---- */}
        <div ref={resultsRef} className="border border-[var(--gray-200)] rounded-xl p-4 sm:p-5 scroll-mt-20">
          <div className="text-sm font-bold text-[var(--gray-900)] mb-4">2. Results</div>

          <div className="rounded-xl bg-[var(--gray-900)] px-5 py-6 text-center">
            <div className="text-xs font-semibold text-white/60 uppercase tracking-wide">Estimated Final Portfolio Value</div>
            <div className="mt-1.5 text-3xl sm:text-4xl font-black tracking-tight text-white">
              {fmtUsd(result.endingPortfolioValue)}
            </div>
            <div className="mt-1 text-xs text-white/50">
              (Total Invested: {fmtUsd(result.totalContributions)})
            </div>
          </div>

          <div className="mt-4 divide-y divide-[var(--gray-100)] text-sm">
            <ResultRow label="Total Contributions" value={fmtUsd(result.totalContributions)} />
            <ResultRow
              label="Total Estimated Return"
              value={fmtUsd(result.totalEstimatedReturnAmount)}
              sublabel={result.totalReturnPct != null ? fmtPct(result.totalReturnPct) : "—"}
            />
            {!reinvestDistributions && result.totalDistributionsReceived > 0 && (
              <ResultRow label="Distributions Received (cash, not reinvested)" value={fmtUsd(result.totalDistributionsReceived)} />
            )}
            <ResultRow label="Money Multiple" value={result.moneyMultiple != null ? `${result.moneyMultiple.toFixed(2)}x` : "—"} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Total Return" value={result.totalReturnPct} />
            <MiniStat label="Annualized Return (After Fees)" value={result.annualizedReturnPct} />
          </div>

          <div className="mt-5">
            <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">Portfolio Growth Over Time</div>
            <GrowthChart yearly={result.yearly} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-[var(--gray-400)]">
        This is a projection based on the assumptions above, not a guarantee. See{" "}
        <a href="#how-this-works" className="underline hover:text-black">
          how this calculation works
        </a>{" "}
        below. For a look at real historical returns instead of a projection, see the{" "}
        <Link href="/portfolio" className="underline hover:text-black">
          Portfolio Total Return Calculator
        </Link>
        .
      </p>
    </div>
  );
}

function NumberField({
  label,
  hint,
  unit,
  value,
  onChange,
  allowNegative = false,
}: {
  label: string;
  hint: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  allowNegative?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-[var(--gray-800)]">{label}</label>
      <div className="mt-1.5 flex rounded-lg border border-[var(--gray-200)] focus-within:border-black overflow-hidden">
        <input
          type="number"
          inputMode="decimal"
          min={allowNegative ? undefined : 0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm outline-none tabular-nums"
        />
        <span className="shrink-0 flex items-center px-3 text-xs font-medium text-[var(--gray-500)] bg-[var(--gray-50)] border-l border-[var(--gray-200)]">
          {unit}
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--gray-500)]">{hint}</p>
    </div>
  );
}

function ResultRow({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 gap-3">
      <span className="text-[var(--gray-600)]">{label}</span>
      <span className="text-right font-semibold text-[var(--gray-900)] tabular-nums">
        {value}
        {sublabel && <span className="ml-1.5 font-normal text-[var(--gray-500)] text-xs">({sublabel})</span>}
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | null }) {
  const color = value == null ? "var(--gray-400)" : value >= 0 ? "#0ca30c" : "#d03b3b";
  return (
    <div className="rounded-lg bg-[var(--gray-50)] px-3 py-3 text-center">
      <div className="text-[11px] font-semibold text-[var(--gray-500)]">{label}</div>
      <div className="mt-0.5 text-lg font-black tracking-tight" style={{ color }}>
        {value != null ? fmtPct(value) : "—"}
      </div>
    </div>
  );
}
