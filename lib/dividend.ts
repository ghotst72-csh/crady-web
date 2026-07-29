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

export const DIVIDEND_STAGE_LABEL: Record<DividendStage, string> = {
  "before-ex": "Ex-Date 예정",
  "awaiting-payment": "지급 대기",
  paid: "지급 완료",
};
