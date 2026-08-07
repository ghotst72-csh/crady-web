import { supabase } from "@/lib/supabase";
import { getHomeSnapshot, type EtfSnapshot } from "@/lib/data";

/** CRADY Next Dividend Hub — one row per tracked ETF with a knowable next
 * dividend, built entirely from real production data (getHomeSnapshot's
 * existing next_predictions/distributions read, plus one additional
 * batched query below — no per-ticker N+1 fetches, no mock/placeholder
 * values).
 *
 * CONFIRMED vs ESTIMATED — the distinction the whole page is built
 * around: a ticker is `isOfficial: true` only when a real `distributions`
 * row already exists for its next payment with a real, non-null `amount`
 * (i.e. the issuer has actually declared it, even if it hasn't paid yet —
 * the same real-world state this session's Distribution Center work
 * repeatedly saw, e.g. TSLY's Aug 5 declaration landing before its Aug 7
 * pay date). Everything else falls back to next_predictions — CRADY's own
 * rule-based forecast — and is always labeled Estimated. */
export type NextDividendBoardEntry = {
  ticker: string;
  name: string | null;
  providerId: string;
  amount: number | null;
  isOfficial: boolean;
  declarationDate: string | null;
  exDate: string | null;
  payDate: string | null;
  confidence: number | null;
  previousAmount: number | null;
  changeFromLastPct: number | null;
  cradyScore: number | null;
};

export type ConfirmedRow = {
  ticker: string;
  declaration_date: string | null;
  ex_date: string;
  pay_date: string;
  amount: number;
};

function computeChangePct(newAmount: number, previousAmount: number | null): number | null {
  return previousAmount != null && previousAmount > 0 ? ((newAmount - previousAmount) / previousAmount) * 100 : null;
}

/** The actual per-ticker decision logic — confirmed row wins over the
 * prediction, and a ticker with neither is honestly omitted (null) rather
 * than rendered with fabricated placeholder values. Pure and exported so
 * it's directly unit-testable without a live Supabase connection — see
 * lib/ticker/nextDividendBoard.test.ts. */
export function resolveBoardEntry(snapshot: EtfSnapshot, confirmed: ConfirmedRow | undefined): NextDividendBoardEntry | null {
  if (confirmed) {
    return {
      ticker: snapshot.ticker,
      name: snapshot.name,
      providerId: snapshot.provider_id,
      amount: confirmed.amount,
      isOfficial: true,
      declarationDate: confirmed.declaration_date,
      exDate: confirmed.ex_date,
      payDate: confirmed.pay_date,
      confidence: null,
      previousAmount: snapshot.latestDividend,
      changeFromLastPct: computeChangePct(confirmed.amount, snapshot.latestDividend),
      cradyScore: snapshot.cradyScore,
    };
  }

  if (snapshot.nextPredictedAmount != null && snapshot.nextPredictedDate != null) {
    return {
      ticker: snapshot.ticker,
      name: snapshot.name,
      providerId: snapshot.provider_id,
      amount: snapshot.nextPredictedAmount,
      isOfficial: false,
      declarationDate: null,
      exDate: snapshot.nextPredictedExDate,
      payDate: snapshot.nextPredictedDate,
      confidence: snapshot.nextPredictedConfidence,
      previousAmount: snapshot.latestDividend,
      changeFromLastPct: computeChangePct(snapshot.nextPredictedAmount, snapshot.latestDividend),
      cradyScore: snapshot.cradyScore,
    };
  }

  return null;
}

export function buildNextDividendBoard(
  snapshot: EtfSnapshot[],
  confirmedByTicker: Map<string, ConfirmedRow>
): NextDividendBoardEntry[] {
  const entries: NextDividendBoardEntry[] = [];
  for (const s of snapshot) {
    const entry = resolveBoardEntry(s, confirmedByTicker.get(s.ticker));
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => (a.payDate ?? "9999-99-99").localeCompare(b.payDate ?? "9999-99-99"));
}

/** Every ticker's soonest already-declared (real, non-null amount) future
 * payment — one batched query, not one per ticker. Ordered by pay_date so
 * the first row seen per ticker in the loop below is always the soonest. */
async function getConfirmedUpcomingByTicker(): Promise<Map<string, ConfirmedRow>> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("distributions")
    .select("ticker, declaration_date, ex_date, pay_date, amount")
    .not("amount", "is", null)
    .gte("pay_date", today)
    .order("pay_date", { ascending: true });
  if (error) throw error;

  const map = new Map<string, ConfirmedRow>();
  for (const row of (data ?? []) as ConfirmedRow[]) {
    if (!map.has(row.ticker)) map.set(row.ticker, row);
  }
  return map;
}

export async function getNextDividendBoard(): Promise<NextDividendBoardEntry[]> {
  const [snapshot, confirmedByTicker] = await Promise.all([getHomeSnapshot(), getConfirmedUpcomingByTicker()]);
  return buildNextDividendBoard(snapshot, confirmedByTicker);
}
