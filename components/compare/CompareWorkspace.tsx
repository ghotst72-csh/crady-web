"use client";

import { useState, useEffect, useTransition } from "react";
import { BarChart3 } from "lucide-react";
import type { SearchEntry } from "@/lib/search/searchTickers";
import { resolveComparePeriod, findClosestAvailablePreset, type ComparePeriodInput } from "@/lib/compare/period";
import { submitComparison, getEarliestAvailableDate, type SubmitComparisonResult } from "@/lib/compare/actions";
import { CompareHero } from "./CompareHero";
import { EtfSelectorRow, type SelectorSlot } from "./EtfSelectorRow";
import { PeriodSelector, type PeriodSelectorValue } from "./PeriodSelector";
import { CommonHistoryNotice } from "./CommonHistoryNotice";
import { SuggestedComparisonChips } from "./SuggestedComparisonChips";
import { CompareEmptyState } from "./CompareEmptyState";
import { CompareResultsGrid } from "./CompareResultsGrid";
import { BenchmarkDiscoverySection } from "./BenchmarkDiscoverySection";

const T = {
  compareButton: { en: "Compare ETFs", ko: "ETF 비교하기" },
  calculating: { en: "Comparing…", ko: "비교 중…" },
  needMore: { en: "Select at least 2 ETFs to compare", ko: "비교하려면 최소 2개의 ETF를 선택하세요" },
  fixDuplicate: { en: "Remove the duplicate ticker to continue", ko: "계속하려면 중복된 티커를 제거하세요" },
  errorGeneric: { en: "Something went wrong — please try again.", ko: "문제가 발생했습니다 — 다시 시도해주세요." },
} as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptySlot(): SelectorSlot {
  return { ticker: null, query: "" };
}

function toComparePeriodInput(value: PeriodSelectorValue): ComparePeriodInput {
  if (value.preset === "custom") {
    return { preset: "custom", customStart: value.customStart, customEnd: value.customEnd };
  }
  return { preset: value.preset };
}

export function CompareWorkspace({
  searchIndex,
  lang = "en",
  basePath = "",
}: {
  searchIndex: SearchEntry[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const [slots, setSlots] = useState<SelectorSlot[]>([emptySlot(), emptySlot()]);
  const [periodValue, setPeriodValue] = useState<PeriodSelectorValue>({ preset: "1Y", customStart: "", customEnd: "" });
  const [result, setResult] = useState<SubmitComparisonResult | null>(null);
  const [benchmarkTicker, setBenchmarkTicker] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [earliestByTicker, setEarliestByTicker] = useState<Record<string, string | null>>({});

  const filledTickers = slots.map((s) => s.ticker).filter((t): t is string => !!t);
  const hasDuplicate = new Set(filledTickers).size !== filledTickers.length;
  const canSubmit = filledTickers.length === slots.length && filledTickers.length >= 2 && !hasDuplicate && !isPending;

  // Proactive, advisory-only: fetch each newly-selected ticker's earliest
  // recorded price once (cached in earliestByTicker, never refetched) so we
  // can tell the user the common available history before they submit. This
  // never touches computePeriodReturn/selectNeighbors — see CommonHistoryNotice.tsx.
  useEffect(() => {
    const missing = filledTickers.filter((t) => !(t in earliestByTicker));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map((t) => getEarliestAvailableDate(t).then((d) => [t, d] as const))).then((pairs) => {
      if (cancelled) return;
      setEarliestByTicker((prev) => {
        const next = { ...prev };
        for (const [t, d] of pairs) next[t] = d;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filledTickers.join(",")]);

  const knownEarliestDates = filledTickers.map((t) => earliestByTicker[t]).filter((d): d is string => !!d);
  const allEarliestKnown = filledTickers.length >= 2 && filledTickers.every((t) => t in earliestByTicker);
  const earliestLoading = filledTickers.length >= 2 && !allEarliestKnown;
  const commonEarliestDate =
    allEarliestKnown && knownEarliestDates.length === filledTickers.length
      ? knownEarliestDates.reduce((max, d) => (d > max ? d : max))
      : null;

  const today = todayIso();
  const currentPeriodResolved = resolveComparePeriod(toComparePeriodInput(periodValue), today);
  const periodTooLong = !!(commonEarliestDate && currentPeriodResolved && currentPeriodResolved.startDate < commonEarliestDate);
  const suggested = commonEarliestDate ? findClosestAvailablePreset(commonEarliestDate, today) : null;
  const currentPeriodLabel = periodValue.preset === "custom" ? `${periodValue.customStart} – ${periodValue.customEnd}` : periodValue.preset;

  function handleUseSuggestedPeriod() {
    if (!suggested) return;
    if (suggested.kind === "preset") {
      setPeriodValue({ preset: suggested.preset, customStart: "", customEnd: "" });
    } else {
      setPeriodValue({ preset: "custom", customStart: suggested.customStart, customEnd: suggested.customEnd });
    }
  }

  function handleQueryChange(index: number, value: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, query: value, ticker: null } : s)));
  }

  function handleSelectTicker(index: number, ticker: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ticker, query: ticker } : s)));
  }

  function handleAdd() {
    setSlots((prev) => (prev.length < 5 ? [...prev, emptySlot()] : prev));
  }

  function handleRemove(index: number) {
    setSlots((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleSuggestedSelect(a: string, b: string) {
    setSlots([
      { ticker: a, query: a },
      { ticker: b, query: b },
    ]);
    setResult(null);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      const r = await submitComparison(filledTickers, toComparePeriodInput(periodValue));
      setResult(r);
      if (r.ok) setBenchmarkTicker(r.selectedTickers[0]);
    });
  }

  const compareEntries =
    result?.ok ? result.selectedTickers.map((t) => result.universe.find((e) => e.ticker === t)!).filter(Boolean) : [];

  return (
    <div>
      <CompareHero lang={lang} />

      <div className="mt-6 rounded-2xl border border-[var(--gray-200)] p-5 sm:p-6">
        <EtfSelectorRow
          slots={slots}
          onQueryChange={handleQueryChange}
          onSelect={handleSelectTicker}
          onAdd={handleAdd}
          onRemove={handleRemove}
          searchIndex={searchIndex}
          lang={lang}
        />

        {!result && (
          <div className="mt-4">
            <SuggestedComparisonChips onSelect={handleSuggestedSelect} lang={lang} />
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-[var(--gray-100)]">
          <PeriodSelector value={periodValue} onChange={setPeriodValue} todayIso={today} lang={lang} />
          {filledTickers.length >= 2 && !hasDuplicate && (
            <CommonHistoryNotice
              loading={earliestLoading}
              commonEarliestDate={commonEarliestDate}
              todayIso={today}
              currentPeriodLabel={currentPeriodLabel}
              periodTooLong={periodTooLong}
              suggested={suggested}
              onUseSuggested={handleUseSuggestedPeriod}
              lang={lang}
            />
          )}
        </div>

        <div className="mt-5">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 text-white text-base font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-[var(--gray-300)] disabled:text-[var(--gray-500)] disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            <BarChart3 size={18} aria-hidden="true" />
            {isPending ? T.calculating[lang] : T.compareButton[lang]}
          </button>
          {!canSubmit && !isPending && (
            <p className="mt-2 text-xs text-[var(--gray-400)]">
              {hasDuplicate ? T.fixDuplicate[lang] : T.needMore[lang]}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8">
        {!result && <CompareEmptyState lang={lang} />}

        {result && !result.ok && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            {T.errorGeneric[lang]}
          </div>
        )}

        {result && result.ok && (
          <div className="space-y-8">
            <CompareResultsGrid
              entries={compareEntries}
              startDate={result.startDate}
              endDate={result.endDate}
              lang={lang}
              basePath={basePath}
            />
            <BenchmarkDiscoverySection
              universe={result.universe}
              selectedTickers={result.selectedTickers}
              benchmarkTicker={benchmarkTicker}
              onBenchmarkChange={setBenchmarkTicker}
              lang={lang}
              basePath={basePath}
            />
          </div>
        )}
      </div>
    </div>
  );
}
