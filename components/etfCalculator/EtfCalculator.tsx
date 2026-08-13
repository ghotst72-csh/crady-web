"use client";

import { useMemo, useState, useTransition } from "react";
import { Calendar, DollarSign, Sparkles, Calculator as CalculatorIcon, RotateCcw, Lock } from "lucide-react";
import { TickerAutocompleteInput } from "@/components/portfolio/TickerAutocompleteInput";
import type { SearchEntry } from "@/lib/search/searchTickers";
import { providerLabel } from "@/lib/providers";
import { resolvePurchasePrice, type SplitWarning } from "@/lib/portfolio/calculations";
import { getPriceHistoryForTicker } from "@/lib/etfCalculator/priceHistoryForTicker";
import { calculateHistoricalReturn, type HistoricalReturnResponse } from "@/lib/etfCalculator/historicalReturn";
import { HistoricalResultCard } from "./HistoricalResultCard";
import { WorkflowExplainer } from "./WorkflowExplainer";
import { QuickExamples, type QuickExample, type QuickExampleMode } from "./QuickExamples";
import { ResultPreview } from "./ResultPreview";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Human phrasing for a detected split day — "N-for-1 split" for a price
 * drop matched to a common ratio, "1-for-N reverse split" for a price
 * rise, or a generic factor description when the ratio didn't match a
 * specific known split (ambiguous confidence). Never mentions "raw
 * close"/implementation details — this is user-facing copy. */
function describeSplitWarning(w: SplitWarning): string {
  if (w.matchedSplitRatio == null) {
    return `price moved by a factor of ${w.ratio.toFixed(2)}x from the prior trading day`;
  }
  if (w.matchedSplitRatio < 1) {
    const n = Math.round(1 / w.matchedSplitRatio);
    return `price dropped ~${(1 / w.matchedSplitRatio).toFixed(1)}x from the prior trading day, consistent with a ${n}-for-1 split`;
  }
  const n = Math.round(w.matchedSplitRatio);
  return `price rose ~${w.matchedSplitRatio.toFixed(1)}x from the prior trading day, consistent with a 1-for-${n} reverse split`;
}

type PricePoint = { trade_date: string; close_price: number | null };

/** Turns a Quick Example's mode into a concrete {purchaseDate, saleDate}
 * pair using the ETF's own real fetched price history — never a hard-coded
 * calendar date. "Current valid historical endpoint" is the latest trading
 * day CRADY actually has a recorded close for (not necessarily "today",
 * which may not have settled yet). Purely a *default input* — the result
 * still flows through the same, unmodified resolvePurchasePrice/
 * calculateHistoricalReturn pipeline as any manually-typed date, including
 * non-trading-day snapping and split-anomaly protection. */
function computeDateRangeForMode(
  history: PricePoint[],
  mode: QuickExampleMode
): { purchaseDate: string; saleDate: string } | null {
  const withPrices = history.filter((h) => h.close_price != null);
  if (withPrices.length === 0) return null;

  const earliest = withPrices[0].trade_date;
  const latest = withPrices[withPrices.length - 1].trade_date;

  if (mode === "inception") {
    return { purchaseDate: earliest, saleDate: latest };
  }

  const latestDate = new Date(`${latest}T00:00:00Z`);
  let purchase: Date;
  if (mode === "1y") {
    purchase = new Date(latestDate);
    purchase.setUTCFullYear(purchase.getUTCFullYear() - 1);
  } else if (mode === "3m") {
    purchase = new Date(latestDate);
    purchase.setUTCMonth(purchase.getUTCMonth() - 3);
  } else {
    // ytd — January 1st of the endpoint's own year, not necessarily
    // today's year (a stale/cached endpoint would otherwise disagree).
    purchase = new Date(Date.UTC(latestDate.getUTCFullYear(), 0, 1));
  }

  let purchaseIso = purchase.toISOString().slice(0, 10);
  // Clamp to the ETF's real earliest available date — e.g. a fund listed
  // 6 months ago selected via "1 Year" gets its actual inception date
  // instead of a range that starts before any real data exists.
  if (purchaseIso < earliest) purchaseIso = earliest;

  return { purchaseDate: purchaseIso, saleDate: latest };
}

export function EtfCalculator({ searchIndex }: { searchIndex: SearchEntry[] }) {
  const [tickerQuery, setTickerQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [etfMeta, setEtfMeta] = useState<{ name: string | null; providerId: string } | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [purchaseDate, setPurchaseDate] = useState(isoDaysAgo(365));
  const [saleDate, setSaleDate] = useState(todayIso());
  const [investmentAmount, setInvestmentAmount] = useState("10000");
  const [dripOn, setDripOn] = useState(false);

  const [result, setResult] = useState<HistoricalReturnResponse | null>(null);
  const [isCalculating, startCalculating] = useTransition();

  // Shared by manual ticker selection and the ticker-specific Quick
  // Examples — fetches once, returns the history so a caller can derive a
  // date range from it without a second round trip or a stale-closure read
  // of state that hasn't committed yet.
  function selectTickerAndFetchHistory(ticker: string): Promise<PricePoint[]> {
    setSelectedTicker(ticker);
    setTickerQuery(ticker);
    setResult(null);
    const entry = searchIndex.find((e) => e.ticker === ticker) ?? null;
    setEtfMeta(entry ? { name: entry.name, providerId: entry.provider_id } : null);
    setPriceHistory([]);
    setHistoryLoading(true);
    return getPriceHistoryForTicker(ticker)
      .then((h) => {
        setPriceHistory(h);
        return h;
      })
      .finally(() => setHistoryLoading(false));
  }

  function handleSelectTicker(ticker: string) {
    void selectTickerAndFetchHistory(ticker);
  }

  // Quick Examples (CRADY ETF Calculator visual refresh) — every date is
  // computed from the ETF's real fetched price history via
  // computeDateRangeForMode, never hard-coded. A ticker-specific example
  // (CONY/MSTY/...) fetches that ticker's history first; a range-only
  // example (Since Inception / Last 3 Months) reuses whatever history is
  // already loaded for the currently-selected ticker. Only sets the same
  // input state a manual selection would — the actual calculation still
  // runs through the unmodified calculateHistoricalReturn pipeline.
  function applyQuickExample(example: QuickExample) {
    setInvestmentAmount(String(example.amount));
    setResult(null);

    if (example.ticker) {
      selectTickerAndFetchHistory(example.ticker).then((history) => {
        const range = computeDateRangeForMode(history, example.mode);
        if (range) {
          setPurchaseDate(range.purchaseDate);
          setSaleDate(range.saleDate);
        }
      });
      return;
    }

    if (priceHistory.length === 0) return; // no ticker selected yet — nothing to compute a range from
    const range = computeDateRangeForMode(priceHistory, example.mode);
    if (range) {
      setPurchaseDate(range.purchaseDate);
      setSaleDate(range.saleDate);
    }
  }

  function handleChangeTicker() {
    setSelectedTicker(null);
    setTickerQuery("");
    setEtfMeta(null);
    setPriceHistory([]);
    setResult(null);
  }

  // Purely client-side, instant — the exact same pure resolver the final
  // "Calculate Return" server action uses, run against the price history
  // already fetched once for this ticker. No extra round trip per
  // keystroke/date change.
  const purchasePreview = useMemo(
    () => (priceHistory.length > 0 && purchaseDate ? resolvePurchasePrice(priceHistory, purchaseDate, null) : null),
    [priceHistory, purchaseDate]
  );
  const salePreview = useMemo(
    () => (priceHistory.length > 0 && saleDate ? resolvePurchasePrice(priceHistory, saleDate, null) : null),
    [priceHistory, saleDate]
  );

  const amountNumber = parseFloat(investmentAmount);
  const canCalculate =
    !!selectedTicker && !!purchaseDate && !!saleDate && saleDate >= purchaseDate && Number.isFinite(amountNumber) && amountNumber > 0;

  function handleCalculate() {
    if (!selectedTicker || !canCalculate) return;
    startCalculating(async () => {
      const r = await calculateHistoricalReturn(selectedTicker, purchaseDate, saleDate, amountNumber);
      setResult(r);
    });
  }

  function handleReset() {
    handleChangeTicker();
    setPurchaseDate(isoDaysAgo(365));
    setSaleDate(todayIso());
    setInvestmentAmount("10000");
    setDripOn(false);
  }

  return (
    <div>
      <WorkflowExplainer />

      <div className="mt-6">
        <QuickExamples hasSelectedTicker={!!selectedTicker} onSelect={applyQuickExample} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ---- Input card ---- */}
        <div className="border border-[var(--gray-200)] rounded-2xl p-5 sm:p-6">
          <div className="text-base font-bold text-blue-600 mb-4">Your Calculation</div>

          {/* Step 1 — ETF */}
          <StepLabel n={1}>ETF</StepLabel>
          {!selectedTicker ? (
            <div className="mt-2">
              <TickerAutocompleteInput
                index={searchIndex}
                value={tickerQuery}
                onChange={setTickerQuery}
                onSelect={handleSelectTicker}
                placeholder="Search ticker, e.g. CONY, TSLY, MSTY..."
                inputClassName="!px-4 !py-3.5 !text-base !rounded-xl"
              />
              <p className="mt-1.5 text-xs text-[var(--gray-400)]">Select an ETF first</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleChangeTicker}
              className="mt-2 w-full flex items-center gap-3 rounded-xl border border-[var(--gray-200)] px-4 py-3.5 text-left hover:border-blue-400 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="shrink-0 w-11 h-11 rounded-full bg-[var(--gray-900)] text-white flex items-center justify-center text-sm font-bold">
                {selectedTicker.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-base">{selectedTicker}</span>
                <span className="block text-xs text-[var(--gray-500)] truncate">
                  {etfMeta?.name ?? "—"} {etfMeta && `· ${providerLabel(etfMeta.providerId)}`}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-blue-600">Change</span>
            </button>
          )}

          {/* Step 2 — Purchase */}
          <StepLabel n={2} className="mt-5">Purchase Date</StepLabel>
          <DateField
            value={purchaseDate}
            onChange={setPurchaseDate}
            max={saleDate || todayIso()}
            disabled={!selectedTicker}
            preview={purchasePreview}
            loading={historyLoading}
          />

          {/* Step 3 — Sale */}
          <StepLabel n={3} className="mt-5">Sale Date</StepLabel>
          <DateField
            value={saleDate}
            onChange={setSaleDate}
            min={purchaseDate}
            max={todayIso()}
            disabled={!selectedTicker}
            preview={salePreview}
            loading={historyLoading}
          />

          {/* Step 4 — Investment */}
          <StepLabel n={4} className="mt-5">Investment Amount</StepLabel>
          <div className="mt-2 flex items-center rounded-xl border border-[var(--gray-200)] focus-within:border-blue-500 overflow-hidden">
            <span className="pl-4 text-[var(--gray-400)]">
              <DollarSign size={20} aria-hidden="true" />
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              className="w-full pl-2 pr-4 py-3.5 text-xl font-bold outline-none tabular-nums"
              placeholder="10,000"
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--gray-400)]">Enter initial investment amount</p>

          <button
            type="button"
            disabled={!canCalculate || isCalculating}
            onClick={handleCalculate}
            className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-blue-600 text-white text-base font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-[var(--gray-300)] disabled:text-[var(--gray-500)] disabled:cursor-not-allowed"
          >
            <CalculatorIcon size={18} aria-hidden="true" />
            {isCalculating ? "Calculating…" : "Calculate Return"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[var(--gray-500)] hover:text-black transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset
          </button>

          {/* Secondary: DRIP toggle — deliberately small/quiet vs. the 4 main inputs above. */}
          <div className="mt-4 pt-4 border-t border-[var(--gray-100)] flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--gray-600)]">
              <Sparkles size={13} className="text-[var(--gray-400)]" aria-hidden="true" />
              Reinvest Distributions (DRIP)
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={dripOn}
              onClick={() => setDripOn((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${dripOn ? "bg-blue-600" : "bg-[var(--gray-200)]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dripOn ? "translate-x-4" : ""}`} />
            </button>
          </div>

          <p className="mt-4 pt-4 border-t border-[var(--gray-100)] flex items-center gap-1.5 text-xs text-[var(--gray-400)]">
            <Lock size={12} aria-hidden="true" />
            All data is real historical prices and actual distributions — no projections, no assumptions.
          </p>
        </div>

        {/* ---- Results ---- */}
        <div className="border border-[var(--gray-200)] rounded-2xl p-5 sm:p-6 min-h-[240px]">
          {!result && !isCalculating && <ResultPreview />}
          {isCalculating && (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[var(--gray-400)]">
              <p className="text-sm">Calculating from real price and distribution history…</p>
            </div>
          )}
          {result && !isCalculating && (
            result.ok ? (
              <HistoricalResultCard result={result} dripOn={dripOn} />
            ) : (
              <ErrorState result={result} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function StepLabel({ n, children, className = "" }: { n: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
        {n}
      </span>
      <span className="text-sm font-bold text-[var(--gray-900)]">{children}</span>
    </div>
  );
}

function DateField({
  value,
  onChange,
  min,
  max,
  disabled,
  preview,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  preview: { effectiveDate: string; effectivePrice: number; dateAdjusted: boolean } | null;
  loading: boolean;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center rounded-xl border border-[var(--gray-200)] focus-within:border-blue-500 overflow-hidden">
        <span className="pl-4 text-blue-500">
          <Calendar size={18} aria-hidden="true" />
        </span>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-2.5 pr-4 py-3.5 text-base outline-none disabled:bg-[var(--gray-50)] disabled:text-[var(--gray-400)] tabular-nums"
        />
      </div>
      <div className="mt-1.5 min-h-[18px] text-xs">
        {disabled ? (
          <span className="text-[var(--gray-400)]">Select an ETF first</span>
        ) : loading ? (
          <span className="text-[var(--gray-400)]">Loading price history…</span>
        ) : preview ? (
          <span className="text-[var(--gray-600)]">
            {preview.dateAdjusted && <span className="text-[var(--gray-400)]">(adjusted to {fmtDate(preview.effectiveDate)}) </span>}
            <span className="font-semibold text-[var(--gray-900)]">${preview.effectivePrice.toFixed(2)}</span>
          </span>
        ) : value ? (
          <span className="text-[var(--gray-400)]">Not trading on or before this date</span>
        ) : null}
      </div>
    </div>
  );
}

function ErrorState({ result }: { result: Extract<HistoricalReturnResponse, { ok: false }> }) {
  const messages: Record<string, string> = {
    "invalid-range": "The sale date must be on or after the purchase date, and the investment amount must be greater than $0.",
    "not-listed-yet": `${result.ticker} has no recorded price on or before the selected purchase date — it likely wasn't listed yet.`,
    "insufficient-data": `Not enough price history is available for ${result.ticker} to resolve the sale date.`,
    "split-anomaly":
      "A large single-day price change was detected between these dates, consistent with a stock split or reverse split that CRADY's price data doesn't carry a ratio for. Showing a return number here could be badly wrong, so it's withheld rather than risk misleading you.",
  };
  return (
    <div className="py-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-[var(--gray-800)]">
        {messages[result.reason]}
        {result.reason === "split-anomaly" && result.splitWarnings && (
          <ul className="mt-2 text-xs text-[var(--gray-600)] list-disc pl-4">
            {result.splitWarnings.map((w) => (
              <li key={w.date}>
                {fmtDate(w.date)}: {describeSplitWarning(w)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
