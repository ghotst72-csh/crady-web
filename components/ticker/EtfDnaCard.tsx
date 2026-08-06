import type { DnaTraits } from "@/lib/ticker/dna";
import { dnaTraitLabel, DNA_TRAIT_ORDER } from "@/lib/ticker/dna";

const T = {
  title: { en: "ETF DNA", ko: "ETF DNA" },
} as const;

function Stars({ count }: { count: number }) {
  return (
    <span aria-hidden className="text-[var(--crady-accent)] tracking-tight">
      {"★".repeat(count)}
      <span className="text-[var(--gray-200)]">{"★".repeat(5 - count)}</span>
    </span>
  );
}

export function EtfDnaCard({ traits, lang = "en" }: { traits: DnaTraits; lang?: "en" | "ko" }) {
  const populated = DNA_TRAIT_ORDER.filter((k) => traits[k] != null);
  if (populated.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
      <div className="text-caption mb-2">{T.title[lang]}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DNA_TRAIT_ORDER.map((key) => {
          const value = traits[key];
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--gray-600)]">{dnaTraitLabel(key, lang)}</span>
              {value != null ? <Stars count={value} /> : <span className="text-xs text-[var(--gray-400)]">—</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
