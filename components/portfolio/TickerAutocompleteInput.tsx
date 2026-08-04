"use client";

import { useState } from "react";
import { searchTickers, splitForHighlight, type SearchEntry } from "@/lib/search/searchTickers";

export function TickerAutocompleteInput({
  index,
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  index: SearchEntry[];
  value: string;
  onChange: (v: string) => void;
  onSelect: (ticker: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const results = searchTickers(index, value, 6);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full px-3 py-2 border border-[var(--gray-200)] rounded-lg text-sm focus:outline-none focus:border-black tabular-nums"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-[var(--gray-200)] rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map((r) => {
            const { before, match, after } = splitForHighlight(r.ticker, value);
            return (
              <button
                key={r.ticker}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(r.ticker);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--gray-100)] flex items-center justify-between gap-2 text-sm"
              >
                <span className="font-semibold shrink-0">
                  {before}
                  <span className="text-[var(--crady-accent)]">{match}</span>
                  {after}
                </span>
                {r.name && <span className="text-xs text-[var(--gray-400)] truncate">{r.name}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
