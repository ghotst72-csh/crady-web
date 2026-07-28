"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { providerLabel } from "@/lib/data";

type Result = { ticker: string; name: string | null; provider_id: string };

function initialQueryFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

export default function SearchPage() {
  const [q, setQ] = useState(initialQueryFromUrl);
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const runSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    setSearched(true);
    if (!trimmed) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const { data } = await supabase
        .from("etfs")
        .select("ticker, name, provider_id")
        .or(`ticker.ilike.%${trimmed}%,name.ilike.%${trimmed}%`)
        .limit(30);
      setResults(data ?? []);
    });
  }, []);

  // Auto-run once on first load if the URL already has ?q= (e.g. homepage
  // search form GET submit). The initial `q` value itself comes from
  // useState's lazy initializer above, not from this effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: runs the search once from the initial URL ?q=, not a render-triggered loop
    if (q) runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold">ETF 검색</h1>

      <form
        className="mt-6 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(q);
        }}
      >
        <div className="flex border border-[var(--gray-300)] rounded-lg overflow-hidden focus-within:border-black transition-colors">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="티커 또는 ETF명 검색 (예: MSTY)"
            className="flex-1 px-4 py-3 text-sm outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="px-5 bg-black text-white text-sm font-medium hover:bg-[var(--gray-900)]"
          >
            검색
          </button>
        </div>
      </form>

      {searched && (
        <div className="mt-8">
          <p className="text-sm text-[var(--gray-500)] mb-3">
            {isPending ? "검색 중..." : `"${q}" 검색 결과 ${results.length}건`}
          </p>
          <div className="border border-[var(--gray-200)] rounded-xl overflow-hidden">
            {results.map((etf) => (
              <Link
                key={etf.ticker}
                href={`/${etf.ticker.toLowerCase()}`}
                className="flex items-center justify-between px-4 py-3 border-b border-[var(--gray-100)] last:border-0 hover:bg-[var(--gray-50)] transition-colors"
              >
                <div>
                  <span className="font-semibold">{etf.ticker}</span>
                  <span className="text-sm text-[var(--gray-500)] ml-2">
                    {etf.name}
                  </span>
                </div>
                <span className="text-xs text-[var(--gray-400)]">
                  {providerLabel(etf.provider_id)}
                </span>
              </Link>
            ))}
            {!isPending && results.length === 0 && (
              <div className="px-4 py-6 text-sm text-[var(--gray-400)] text-center">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
