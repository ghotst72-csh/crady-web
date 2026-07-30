export type DividendStage = "before-ex" | "awaiting-payment" | "paid";

/** Where a distribution sits in its Declaration → Ex-Date → Payment lifecycle,
 * derived purely from real ex/pay dates (never a fabricated declaration date). */
export function getDividendStage(
  exDate: string,
  payDate: string,
  today: Date = new Date()
): DividendStage {
  const t = today.getTime();
  if (t < new Date(exDate).getTime()) return "before-ex";
  if (t < new Date(payDate).getTime()) return "awaiting-payment";
  return "paid";
}

/** Bilingual — DividendStagePill renders on both the (en) tree, the /ko
 * tree, AND every Magazine page (English-only, see lib/magazine/sections.tsx
 * nextDividendHighlight). Previously hardcoded Korean text regardless of
 * caller, which meant every English Magazine page was silently showing a
 * Korean-language badge — found during the international SEO audit. */
export const DIVIDEND_STAGE_LABEL: Record<"en" | "ko", Record<DividendStage, string>> = {
  en: {
    "before-ex": "Upcoming Ex-Date",
    "awaiting-payment": "Awaiting Payment",
    paid: "Paid",
  },
  ko: {
    "before-ex": "Ex-Date 예정",
    "awaiting-payment": "지급 대기",
    paid: "지급 완료",
  },
};
