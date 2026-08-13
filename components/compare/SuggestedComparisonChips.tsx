"use client";

const T = {
  label: { en: "Try comparing:", ko: "이런 비교는 어떨까요:" },
} as const;

const SUGGESTIONS: [string, string][] = [
  ["CONY", "MSTY"],
  ["TSLY", "NVDY"],
  ["YMAX", "YMAG"],
];

/** Real functional shortcuts — clicking a chip populates the first two
 * selector slots with these actual CRADY-tracked tickers, nothing
 * decorative. */
export function SuggestedComparisonChips({
  onSelect,
  lang = "en",
}: {
  onSelect: (a: string, b: string) => void;
  lang?: "en" | "ko";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-[var(--gray-500)]">{T.label[lang]}</span>
      {SUGGESTIONS.map(([a, b]) => (
        <button
          key={`${a}-${b}`}
          type="button"
          onClick={() => onSelect(a, b)}
          className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {a} vs {b}
        </button>
      ))}
    </div>
  );
}
