"use client";

import { Plus, X } from "lucide-react";
import { TickerAutocompleteInput } from "@/components/portfolio/TickerAutocompleteInput";
import type { SearchEntry } from "@/lib/search/searchTickers";
import { SLOT_LABELS, SLOT_COLORS } from "./colors";

const MIN_ETFS = 2;
const MAX_ETFS = 5;

const T = {
  slotLabel: { en: (letter: string) => `ETF ${letter}`, ko: (letter: string) => `ETF ${letter}` },
  placeholder: { en: "Search ticker...", ko: "티커 검색..." },
  addEtf: { en: "+ Add ETF", ko: "+ ETF 추가" },
  remove: { en: "Remove", ko: "제거" },
  duplicate: { en: "Already selected in another slot", ko: "다른 슬롯에 이미 선택됨" },
  helperFirst: { en: "Select the first ETF to compare", ko: "비교할 첫 번째 ETF를 선택하세요" },
  helperNext: { en: (letter: string) => `Select ETF ${letter}`, ko: (letter: string) => `ETF ${letter} 선택` },
} as const;

export type SelectorSlot = { ticker: string | null; query: string };

export function EtfSelectorRow({
  slots,
  onQueryChange,
  onSelect,
  onAdd,
  onRemove,
  searchIndex,
  lang = "en",
}: {
  slots: SelectorSlot[];
  onQueryChange: (index: number, value: string) => void;
  onSelect: (index: number, ticker: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  searchIndex: SearchEntry[];
  lang?: "en" | "ko";
}) {
  const selectedTickers = slots.map((s) => s.ticker).filter((t): t is string => !!t);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {slots.map((slot, i) => {
        const color = SLOT_COLORS[i % SLOT_COLORS.length];
        const letter = SLOT_LABELS[i] ?? String(i + 1);
        const isDuplicate = !!slot.ticker && selectedTickers.filter((t) => t === slot.ticker).length > 1;
        const canRemove = slots.length > MIN_ETFS && i >= MIN_ETFS;

        return (
          <div key={i} className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${color.text}`}>
                <span className={`w-5 h-5 rounded-full ${color.solid} text-white flex items-center justify-center text-[10px]`}>
                  {letter}
                </span>
                {T.slotLabel[lang](letter)}
              </span>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label={T.remove[lang]}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--gray-400)] hover:text-red-600 hover:bg-red-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
            <TickerAutocompleteInput
              index={searchIndex}
              value={slot.query}
              onChange={(v) => onQueryChange(i, v)}
              onSelect={(t) => onSelect(i, t)}
              placeholder={T.placeholder[lang]}
              inputClassName={`!py-3 !px-4 !text-base !rounded-xl ${isDuplicate ? "!border-red-300" : color.focusBorder}`}
            />
            <p className={`mt-1.5 text-xs ${isDuplicate ? "text-red-600 font-semibold" : "text-[var(--gray-400)]"}`}>
              {isDuplicate ? T.duplicate[lang] : i === 0 ? T.helperFirst[lang] : T.helperNext[lang](letter)}
            </p>
          </div>
        );
      })}

      {slots.length < MAX_ETFS && (
        <button
          type="button"
          onClick={onAdd}
          className="min-h-[86px] rounded-xl border-2 border-dashed border-[var(--gray-300)] flex flex-col items-center justify-center gap-1 text-[var(--gray-500)] hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus size={18} aria-hidden="true" />
          <span className="text-sm font-bold">{T.addEtf[lang]}</span>
        </button>
      )}
    </div>
  );
}
