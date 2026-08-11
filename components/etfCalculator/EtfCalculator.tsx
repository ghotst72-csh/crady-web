"use client";

import { useMemo, useState, useTransition } from "react";
import { Calendar, DollarSign, Sparkles } from "lucide-react";
import { TickerAutocompleteInput } from "@/components/portfolio/TickerAutocompleteInput";
import type { SearchEntry } from "@/lib/search/searchTickers";
import { providerLabel } from "@/lib/providers";
import { resolvePurchasePrice } from "@/lib/portfolio/calculations";
import { getPriceHistoryForTicker } from "@/lib/etfCalculator/priceHistoryForTicker";
import { calculateHistoricalReturn, type HistoricalReturnResponse } from "@/lib/etfCalculator/historicalReturn";
import { HistoricalResultCard } from "./HistoricalResultCard";

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

type PricePoint = { trade_date: string; close_price: number | null };

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

  function handleSelectTicker(ticker: string) {
    setSelectedTicker(ticker);
    setTickerQuery(ticker);
    setResult(null);
    const entry = searchIndex.find((e) => e.ticker === ticker) ?? null;
    setEtfMeta(entry ? { name: entry.name, providerId: entry.provider_id } : null);
    setPriceHistory([]);
    setHistoryLoading(true);
    getPriceHistoryForTicker(ticker)
      .then((h) => setPriceHistory(h))
      .finally(() => setHistoryLoading(false));
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ---- Input card ---- */}
      <div className="border border-[var(--gray-200)] rounded-2xl p-4 sm:p-5">
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
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={handleChangeTicker}
            className="mt-2 w-full flex items-center gap-3 rounded-xl border border-[var(--gray-200)] px-3.5 py-3 text-left hover:border-black transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]"
          >
            <span className="shrink-0 w-10 h-10 rounded-full bg-[var(--gray-900)] text-white flex items-center justify-center text-xs font-bold">
              {selectedTicker.slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-sm">{selectedTicker}</span>
              <span className="block text-xs text-[var(--gray-500)] truncate">
                {etfMeta?.name ?? "—"} {etfMeta && `· ${providerLabel(etfMeta.providerId)}`}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-[#92400e]">Change</span>
          </button>
        )}

        {/* Step 2 — Purchase */}
        <StepLabel n={2} className="mt-5">Purchase</StepLabel>
        <DateField
          value={purchaseDate}
          onChange={setPurchaseDate}
          max={saleDate || todayIso()}
          disabled={!selectedTicker}
          preview={purchasePreview}
          loading={historyLoading}
        />

        {/* Step 3 — Sale */}
        <StepLabel n={3} className="mt-5">Sale</StepLabel>
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
        <StepLabel n={4} className="mt-5">Investment</StepLabel>
        <div className="mt-2 flex items-center rounded-xl border border-[var(--gray-200)] focus-within:border-black overflow-hidden">
          <span className="pl-3.5 text-[var(--gray-400)]">
            <DollarSign size={18} aria-hidden="true" />
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
            className="w-full pl-1.5 pr-3.5 py-3 text-lg font-bold outline-none tabular-nums"
            placeholder="10,000"
          />
        </div>

        <button
          type="button"
          disabled={!canCalculate || isCalculating}
          onClick={handleCalculate}
          className="mt-5 w-full px-4 py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-[var(--gray-800)] active:bg-[var(--gray-900)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)] focus-visible:ring-offset-2 disabled:bg-[var(--gray-300)] disabled:text-[var(--gray-500)] disabled:cursor-not-allowed"
        >
          {isCalculating ? "Calculating…" : "Calculate Return"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="mt-2 w-full px-4 py-2 rounded-xl text-xs font-semibold text-[var(--gray-500)] hover:text-black transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)] rounded-xl"
        >
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
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)] focus-visible:ring-offset-2 ${dripOn ? "bg-blue-600" : "bg-[var(--gray-200)]"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dripOn ? "translate-x-4" : ""}`} />
          </button>
        </div>
      </div>

      {/* ---- Results ---- */}
      <div className="border border-[var(--gray-200)] rounded-2xl p-4 sm:p-5 min-h-[240px]">
        {!result && !isCalculating && (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[var(--gray-400)]">
            <Calendar size={28} className="mb-2" aria-hidden="true" />
            <p className="text-sm">Pick an ETF, purchase date, sale date, and amount, then Calculate Return.</p>
          </div>
        )}
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
  );
}

function StepLabel({ n, children, className = "" }: { n: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--gray-900)] text-white text-[10px] font-bold flex items-center justify-center">
        {n}
      </span>
      <span className="text-xs font-bold text-[var(--gray-900)] uppercase tracking-wide">{children}</span>
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
      <div className="flex items-center rounded-xl border border-[var(--gray-200)] focus-within:border-black overflow-hidden">
        <span className="pl-3.5 text-[var(--gray-400)]">
          <Calendar size={16} aria-hidden="true" />
        </span>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-2 pr-3.5 py-2.5 text-sm outline-none disabled:bg-[var(--gray-50)] disabled:text-[var(--gray-400)] tabular-nums"
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
                {fmtDate(w.date)}: price moved by a factor of {w.ratio.toFixed(2)}x from the prior trading day
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
