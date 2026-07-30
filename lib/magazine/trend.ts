import type { DistributionRow } from "@/lib/data";

export type TrendWindow = {
  days: 90 | 180 | 365;
  label: string;
  count: number;
  avg: number | null;
  max: number | null;
  min: number | null;
  increases: number;
  decreases: number;
  avgChangePct: number | null;
};

/** Buckets one already-fetched ~13-month distribution list into 90/180/365
 * day trailing windows — one query, three windows, instead of three
 * separate date-bounded fetches. Increase/decrease counts and avg change
 * are computed payment-over-payment within each window (chronological
 * order), not vs. a single baseline. */
export function computeDividendTrend(distributions: DistributionRow[]): TrendWindow[] {
  const paid = distributions
    .filter((d): d is DistributionRow & { amount: number } => d.amount != null)
    .slice()
    .sort((a, b) => (a.pay_date < b.pay_date ? -1 : 1));

  const now = new Date();
  const windows: [90 | 180 | 365, string][] = [
    [90, "Last 3 Months"],
    [180, "Last 6 Months"],
    [365, "Last 12 Months"],
  ];

  return windows.map(([days, label]) => {
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const inWindow = paid.filter((d) => d.pay_date >= since);

    if (inWindow.length === 0) {
      return { days, label, count: 0, avg: null, max: null, min: null, increases: 0, decreases: 0, avgChangePct: null };
    }

    const amounts = inWindow.map((d) => d.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);

    let increases = 0;
    let decreases = 0;
    const changePcts: number[] = [];
    for (let i = 1; i < inWindow.length; i++) {
      const prev = inWindow[i - 1].amount;
      const curr = inWindow[i].amount;
      if (prev <= 0) continue;
      const changePct = ((curr - prev) / prev) * 100;
      changePcts.push(changePct);
      if (curr > prev) increases++;
      else if (curr < prev) decreases++;
    }
    const avgChangePct =
      changePcts.length > 0 ? changePcts.reduce((a, b) => a + b, 0) / changePcts.length : null;

    return { days, label, count: inWindow.length, avg, max, min, increases, decreases, avgChangePct };
  });
}
