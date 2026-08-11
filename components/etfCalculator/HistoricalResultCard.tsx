"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, ChevronDown } from "lucide-react";
import type { HistoricalReturnResponse } from "@/lib/etfCalculator/historicalReturn";

function fmtUsd(n: number, digits = 0): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
function fmtUsdSigned(n: number, digits = 0): string {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
function fmtPct(n: number, digits = 2): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}
function fmtShares(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

const GREEN = "#0ca30c";
const RED = "#d03b3b";

export function HistoricalResultCard({
  result,
  dripOn,
}: {
  result: Extract<HistoricalReturnResponse, { ok: true }>;
  dripOn: boolean;
}) {
  const [showDistributions, setShowDistributions] = useState(false);

  const finalValue = dripOn ? result.dripFinalValue : result.finalValueCash;
  const profitLoss = dripOn ? result.dripProfitLoss : result.profitLossCash;
  const totalReturnPct = dripOn ? result.dripTotalReturnPct : result.totalReturnPctCash;
  const annualizedReturnPct = dripOn ? result.dripAnnualizedReturnPct : result.annualizedReturnPctCash;
  const profitPositive = profitLoss >= 0;

  const maxAbs = Math.max(Math.abs(result.priceGainLoss), Math.abs(result.totalDistributionsReceived), Math.abs(profitLoss), 1);

  return (
    <div>
      <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
        Your {fmtUsd(result.investmentAmount)} Investment in {result.ticker}
      </div>

      {/* ---- Share Value + Distributions ---- */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--gray-200)] p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--gray-500)]">
            {result.priceGainLoss >= 0 ? <TrendingUp size={14} className="text-[#0ca30c]" /> : <TrendingDown size={14} className="text-[#d03b3b]" />}
            Share Value
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[var(--gray-900)]">{fmtUsd(result.endingShareValue)}</div>
          <div className="text-sm font-semibold" style={{ color: result.priceGainLoss >= 0 ? GREEN : RED }}>
            {fmtUsdSigned(result.priceGainLoss)}
          </div>
          <div className="mt-1.5 text-[11px] text-[var(--gray-500)]">
            {fmtShares(result.shares)} sh · ${result.purchasePrice.toFixed(2)} → ${result.salePrice.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--gray-200)] p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--gray-500)]">
            <Wallet size={14} className="text-[#92400e]" />
            Distributions
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#0ca30c]">
            +{fmtUsd(result.totalDistributionsReceived)}
          </div>
          <div className="text-sm font-semibold text-[var(--gray-400)]">&nbsp;</div>
          <div className="mt-1.5 text-[11px] text-[var(--gray-500)]">
            {result.distributions.length} payment{result.distributions.length === 1 ? "" : "s"} · ${result.distributionPerShareTotal.toFixed(4)}/sh
          </div>
        </div>
      </div>

      {/* ---- Final Value hero (CRADY blue) ---- */}
      <div className="mt-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 px-5 py-6 text-center text-white">
        <div className="text-xs font-semibold text-white/70 uppercase tracking-wide">
          Final Value{dripOn ? " (Distributions Reinvested)" : ""}
        </div>
        <div className="mt-1 text-3xl sm:text-4xl font-black tracking-tight">{fmtUsd(finalValue)}</div>
        <div className="mt-2 flex items-center justify-center gap-4 text-sm font-semibold">
          <span>{fmtUsdSigned(profitLoss)} profit</span>
          <span className="opacity-50">·</span>
          <span>{totalReturnPct != null ? fmtPct(totalReturnPct) : "—"} return</span>
        </div>
        {annualizedReturnPct != null && (
          <div className="mt-1 text-xs text-white/70">{fmtPct(annualizedReturnPct)} annualized</div>
        )}
        {!profitPositive && (
          <div className="mt-2 text-[11px] text-white/70">
            Distributions did not fully offset the price decline over this period.
          </div>
        )}
      </div>

      {/* ---- Breakdown: where did your return come from ---- */}
      <div className="mt-5">
        <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2.5">
          Where Did Your Return Come From?
        </div>
        <div className="space-y-2">
          <BreakdownBar label="Price Return" value={result.priceGainLoss} maxAbs={maxAbs} />
          <BreakdownBar label="Distributions" value={result.totalDistributionsReceived} maxAbs={maxAbs} />
          <BreakdownBar label="Net Result" value={result.profitLossCash} maxAbs={maxAbs} bold />
        </div>
      </div>

      {/* ---- Holding period timeline ---- */}
      <div className="mt-6">
        <HoldingTimeline
          purchaseDate={result.purchaseDate}
          purchasePrice={result.purchasePrice}
          saleDate={result.saleDate}
          salePrice={result.salePrice}
          distributions={result.distributions}
        />
      </div>

      {/* ---- Distribution history ---- */}
      <div className="mt-5 rounded-xl border border-[var(--gray-200)] p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[var(--gray-50)] flex items-center justify-center shrink-0">
              <Wallet size={15} className="text-[#92400e]" />
            </span>
            <div>
              <div className="text-sm font-bold text-[var(--gray-900)]">{fmtUsd(result.totalDistributionsReceived)} Total Distributions</div>
              <div className="text-xs text-[var(--gray-500)]">{result.distributions.length} payment{result.distributions.length === 1 ? "" : "s"}</div>
            </div>
          </div>
          {result.distributions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDistributions((v) => !v)}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold text-[#92400e] hover:underline outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)] rounded px-1"
            >
              View {result.distributions.length} payment{result.distributions.length === 1 ? "" : "s"}
              <ChevronDown size={14} className={`transition-transform ${showDistributions ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {showDistributions && result.distributions.length > 0 && (
          <div className="mt-3 border-t border-[var(--gray-100)] pt-3 max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--gray-500)]">
                  <th className="text-left font-medium pb-1.5">Date</th>
                  <th className="text-right font-medium pb-1.5">Per Share</th>
                  <th className="text-right font-medium pb-1.5">Shares</th>
                  <th className="text-right font-medium pb-1.5">Cash Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {result.distributions.map((d) => (
                  <tr key={d.exDate}>
                    <td className="py-1.5">{fmtDate(d.exDate)}</td>
                    <td className="py-1.5 text-right tabular-nums">${d.amountPerShare.toFixed(4)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmtShares(d.shares)}</td>
                    <td className="py-1.5 text-right tabular-nums font-semibold">{fmtUsd(d.cashReceived, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(result.purchaseDateAdjusted || result.saleDateAdjusted) && (
        <p className="mt-3 text-[11px] text-[var(--gray-400)]">
          {result.purchaseDateAdjusted && `Purchase date adjusted from ${fmtDate(result.requestedPurchaseDate)} (not a trading day) to the prior trading day. `}
          {result.saleDateAdjusted && `Sale date adjusted from ${fmtDate(result.requestedSaleDate)} (not a trading day) to the prior trading day.`}
        </p>
      )}
    </div>
  );
}

function BreakdownBar({ label, value, maxAbs, bold = false }: { label: string; value: number; maxAbs: number; bold?: boolean }) {
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(value) / maxAbs) * 100) : 0;
  const color = value >= 0 ? GREEN : RED;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-24 shrink-0 text-xs ${bold ? "font-bold text-[var(--gray-800)]" : "font-semibold text-[var(--gray-500)]"}`}>{label}</div>
      <div className="flex-1 h-5 rounded-full bg-[var(--gray-100)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className={`w-20 shrink-0 text-right tabular-nums ${bold ? "text-sm font-bold" : "text-xs font-semibold"}`} style={{ color }}>
        {fmtUsdSigned(value)}
      </div>
    </div>
  );
}

function HoldingTimeline({
  purchaseDate,
  purchasePrice,
  saleDate,
  salePrice,
  distributions,
}: {
  purchaseDate: string;
  purchasePrice: number;
  saleDate: string;
  salePrice: number;
  distributions: { exDate: string; amountPerShare: number }[];
}) {
  const startMs = new Date(`${purchaseDate}T00:00:00Z`).getTime();
  const endMs = new Date(`${saleDate}T00:00:00Z`).getTime();
  const span = endMs - startMs || 1;

  return (
    <div>
      <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-4">Holding Period</div>
      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-[var(--gray-300)] to-blue-300 mx-2">
        {distributions.map((d) => {
          const dMs = new Date(`${d.exDate}T00:00:00Z`).getTime();
          const pos = Math.min(100, Math.max(0, ((dMs - startMs) / span) * 100));
          return (
            <div
              key={d.exDate}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white border-2 border-blue-500"
              style={{ left: `${pos}%` }}
              title={`${fmtDate(d.exDate)}: $${d.amountPerShare.toFixed(4)}/share`}
            />
          );
        })}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[var(--gray-900)] border-2 border-white shadow" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[var(--gray-900)] border-2 border-white shadow" />
      </div>
      <div className="mt-3 flex items-start justify-between text-xs">
        <div>
          <div className="font-bold text-[var(--gray-900)]">Purchase</div>
          <div className="text-[var(--gray-500)]">{fmtDate(purchaseDate)}</div>
          <div className="text-[var(--gray-500)]">${purchasePrice.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-[var(--gray-900)]">Sale</div>
          <div className="text-[var(--gray-500)]">{fmtDate(saleDate)}</div>
          <div className="text-[var(--gray-500)]">${salePrice.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
