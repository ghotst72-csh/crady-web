"use client";

import { useState } from "react";
import { TickerAutocompleteInput } from "./TickerAutocompleteInput";
import type { SearchEntry } from "@/lib/search/searchTickers";
import type { Holding } from "@/lib/portfolio/types";

const T = {
  addHolding: { en: "Add a Holding", ko: "보유 종목 추가" },
  ticker: { en: "ETF Ticker", ko: "ETF 티커" },
  purchaseDate: { en: "Purchase Date", ko: "매수일" },
  amountMode: { en: "Enter as", ko: "입력 방식" },
  shares: { en: "Shares", ko: "주식 수" },
  amount: { en: "Investment Amount", ko: "투자금액" },
  avgPrice: { en: "Average Purchase Price (optional)", ko: "평균 매수가 (선택)" },
  avgPriceHint: {
    en: "Leave blank to auto-estimate from the closing price on your purchase date.",
    ko: "비워두면 매수일 종가로 자동 추정합니다.",
  },
  reinvest: { en: "Dividends were reinvested", ko: "배당금 재투자" },
  add: { en: "Add Holding", ko: "추가하기" },
  errTicker: { en: "Enter a ticker.", ko: "티커를 입력하세요." },
  errDate: { en: "Enter a purchase date.", ko: "매수일을 입력하세요." },
  errFutureDate: { en: "Purchase date can't be in the future.", ko: "매수일은 미래 날짜일 수 없습니다." },
  errAmount: { en: "Enter either shares or an investment amount, greater than zero.", ko: "주식 수 또는 투자금액을 0보다 크게 입력하세요." },
} as const;

export function HoldingInputForm({
  index,
  lang = "en",
  onAdd,
  defaultTicker,
}: {
  index: SearchEntry[];
  lang?: "en" | "ko";
  onAdd: (holding: Holding) => void;
  defaultTicker?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const [ticker, setTicker] = useState(defaultTicker ?? "");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [amountMode, setAmountMode] = useState<"shares" | "amount">("shares");
  const [shares, setShares] = useState("");
  const [amount, setAmount] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [reinvest, setReinvest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!ticker.trim()) return setError(T.errTicker[lang]);
    if (!purchaseDate) return setError(T.errDate[lang]);
    if (purchaseDate > today) return setError(T.errFutureDate[lang]);

    const sharesNum = amountMode === "shares" ? parseFloat(shares) : null;
    const amountNum = amountMode === "amount" ? parseFloat(amount) : null;
    const validShares = sharesNum != null && Number.isFinite(sharesNum) && sharesNum > 0;
    const validAmount = amountNum != null && Number.isFinite(amountNum) && amountNum > 0;
    if (!validShares && !validAmount) return setError(T.errAmount[lang]);

    const avgPriceNum = avgPrice.trim() ? parseFloat(avgPrice) : null;
    const validAvgPrice = avgPriceNum != null && Number.isFinite(avgPriceNum) && avgPriceNum > 0 ? avgPriceNum : null;

    onAdd({
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      ticker: ticker.trim().toUpperCase(),
      purchaseDate,
      shares: validShares ? sharesNum : null,
      investmentAmount: validAmount ? amountNum : null,
      avgPurchasePrice: validAvgPrice,
      dividendReinvestment: reinvest,
    });

    setTicker("");
    setPurchaseDate("");
    setShares("");
    setAmount("");
    setAvgPrice("");
    setReinvest(false);
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
      <div className="text-sm font-bold mb-3">{T.addHolding[lang]}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-[var(--gray-600)]">{T.ticker[lang]}</span>
          <div className="mt-1">
            <TickerAutocompleteInput
              index={index}
              value={ticker}
              onChange={setTicker}
              onSelect={setTicker}
              placeholder="TSLY"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[var(--gray-600)]">{T.purchaseDate[lang]}</span>
          <input
            type="date"
            value={purchaseDate}
            max={today}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-[var(--gray-200)] rounded-lg text-sm focus:outline-none focus:border-black tabular-nums"
          />
        </label>

        <div className="sm:col-span-2">
          <span className="text-xs font-medium text-[var(--gray-600)]">{T.amountMode[lang]}</span>
          <div className="mt-1 inline-flex rounded-lg border border-[var(--gray-200)] p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAmountMode("shares")}
              className={`px-3 py-1.5 rounded-md transition-colors ${amountMode === "shares" ? "bg-black text-white" : "text-[var(--gray-500)]"}`}
            >
              {T.shares[lang]}
            </button>
            <button
              type="button"
              onClick={() => setAmountMode("amount")}
              className={`px-3 py-1.5 rounded-md transition-colors ${amountMode === "amount" ? "bg-black text-white" : "text-[var(--gray-500)]"}`}
            >
              {T.amount[lang]}
            </button>
          </div>
          <div className="mt-2">
            {amountMode === "shares" ? (
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="500"
                className="w-full sm:w-48 px-3 py-2 border border-[var(--gray-200)] rounded-lg text-sm focus:outline-none focus:border-black tabular-nums"
              />
            ) : (
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10000"
                className="w-full sm:w-48 px-3 py-2 border border-[var(--gray-200)] rounded-lg text-sm focus:outline-none focus:border-black tabular-nums"
              />
            )}
          </div>
        </div>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-[var(--gray-600)]">{T.avgPrice[lang]}</span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
            placeholder="14.20"
            className="mt-1 w-full sm:w-48 px-3 py-2 border border-[var(--gray-200)] rounded-lg text-sm focus:outline-none focus:border-black tabular-nums"
          />
          <span className="block mt-1 text-[11px] text-[var(--gray-500)]">{T.avgPriceHint[lang]}</span>
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-[var(--gray-600)]">
        <input type="checkbox" checked={reinvest} onChange={(e) => setReinvest(e.target.checked)} />
        {T.reinvest[lang]}
      </label>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        className="mt-4 inline-flex items-center px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-[var(--gray-900)] transition-colors"
      >
        {T.add[lang]}
      </button>
    </form>
  );
}
