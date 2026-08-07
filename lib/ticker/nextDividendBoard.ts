import { supabase } from "@/lib/supabase";
import { getHomeSnapshot, type EtfSnapshot } from "@/lib/data";

/** CRADY Next Dividend Hub — one row per tracked ETF with a knowable next
 * dividend, built entirely from real production data (getHomeSnapshot's
 * existing next_predictions/distributions read, plus one additional
 * batched query below — no per-ticker N+1 fetches, no mock/placeholder
 * values).
 *
 * STATUS MODEL — audited against real production data, not assumed.
 * YieldMax's real cadence is declare -> ex-date next day -> pay-date the
 * day after (see this session's Distribution Center work) — so by the
 * time a distribution is "Confirmed" (a real distributions row with a
 * non-null amount exists), it is almost always paying same-day or within
 * a day or two. Checked live on 2026-08-07: every single confirmed
 * distribution sitewide had pay_date === today, and zero had a strictly
 * future pay_date. Collapsing that into a generic "Confirmed" badge is a
 * real semantic bug — it shows money landing *today* as if it were still
 * "next." Four real, date-driven states instead:
 *   - "paid": pay_date < today (defensive — getConfirmedUpcomingByTicker's
 *     own query already excludes these, kept here so the type can never
 *     misrepresent a stale row if that query is ever loosened)
 *   - "paying-today": pay_date === today — real, declared, landing today
 *   - "confirmed": pay_date > today — real, declared, genuinely upcoming
 *   - "estimated": no real declared row yet; next_predictions only
 * None of these are invented — each is a plain comparison between a real
 * `distributions.pay_date` and the real current date. */
export type NextDividendStatus = "paid" | "paying-today" | "confirmed" | "estimated";

export type NextDividendBoardEntry = {
  ticker: string;
  name: string | null;
  providerId: string;
  amount: number | null;
  isOfficial: boolean;
  status: NextDividendStatus;
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

function classifyConfirmedStatus(payDate: string, todayIso: string): Extract<NextDividendStatus, "paid" | "paying-today" | "confirmed"> {
  if (payDate < todayIso) return "paid";
  if (payDate === todayIso) return "paying-today";
  return "confirmed";
}

/** The actual per-ticker decision logic — confirmed row wins over the
 * prediction, and a ticker with neither is honestly omitted (null) rather
 * than rendered with fabricated placeholder values. Pure and exported so
 * it's directly unit-testable without a live Supabase connection — see
 * lib/ticker/nextDividendBoard.test.ts. `todayIso` is a parameter (not
 * read internally) for the same reason — deterministic tests, no clock
 * mocking required. */
export function resolveBoardEntry(
  snapshot: EtfSnapshot,
  confirmed: ConfirmedRow | undefined,
  todayIso: string
): NextDividendBoardEntry | null {
  if (confirmed) {
    return {
      ticker: snapshot.ticker,
      name: snapshot.name,
      providerId: snapshot.provider_id,
      amount: confirmed.amount,
      isOfficial: true,
      status: classifyConfirmedStatus(confirmed.pay_date, todayIso),
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
      status: "estimated",
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
  confirmedByTicker: Map<string, ConfirmedRow>,
  todayIso: string = new Date().toISOString().slice(0, 10)
): NextDividendBoardEntry[] {
  const entries: NextDividendBoardEntry[] = [];
  for (const s of snapshot) {
    const entry = resolveBoardEntry(s, confirmedByTicker.get(s.ticker), todayIso);
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => (a.payDate ?? "9999-99-99").localeCompare(b.payDate ?? "9999-99-99"));
}

/** Every ticker's soonest already-declared (real, non-null amount) future
 * payment — one batched query, not one per ticker. Ordered by pay_date so
 * the first row seen per ticker in the loop below is always the soonest.
 * `pay_date >= today` deliberately includes today (paying-today is a real,
 * distinct status above, not excluded). */
async function getConfirmedUpcomingByTicker(todayIso: string): Promise<Map<string, ConfirmedRow>> {
  const { data, error } = await supabase
    .from("distributions")
    .select("ticker, declaration_date, ex_date, pay_date, amount")
    .not("amount", "is", null)
    .gte("pay_date", todayIso)
    .order("pay_date", { ascending: true });
  if (error) throw error;

  const map = new Map<string, ConfirmedRow>();
  for (const row of (data ?? []) as ConfirmedRow[]) {
    if (!map.has(row.ticker)) map.set(row.ticker, row);
  }
  return map;
}

export async function getNextDividendBoard(): Promise<NextDividendBoardEntry[]> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [snapshot, confirmedByTicker] = await Promise.all([getHomeSnapshot(), getConfirmedUpcomingByTicker(todayIso)]);
  return buildNextDividendBoard(snapshot, confirmedByTicker, todayIso);
}

export type NextDividendSummaryStats = {
  thisWeekCount: number;
  confirmedCount: number;
  awaitingCount: number;
  highest: { ticker: string; amount: number } | null;
};

/** The compact "grasp this week in 3 seconds" summary row above the card
 * grid — four real numbers computed from the same entries the grid below
 * renders, nothing separately fetched or fabricated. `confirmedCount`
 * counts both "paying-today" and "confirmed" (both are isOfficial: true —
 * a real declared amount exists) since the summary's job is "how many
 * ETFs have a known real amount right now," not the today-vs-later
 * distinction the individual card badges already carry. */
export function computeSummaryStats(entries: NextDividendBoardEntry[], todayIso: string = new Date().toISOString().slice(0, 10)): NextDividendSummaryStats {
  const weekAhead = new Date(todayIso + "T00:00:00Z");
  weekAhead.setUTCDate(weekAhead.getUTCDate() + 7);
  const weekAheadIso = weekAhead.toISOString().slice(0, 10);

  let thisWeekCount = 0;
  let confirmedCount = 0;
  let awaitingCount = 0;
  let highest: { ticker: string; amount: number } | null = null;

  for (const e of entries) {
    if (e.payDate != null && e.payDate >= todayIso && e.payDate < weekAheadIso) thisWeekCount++;
    if (e.isOfficial) confirmedCount++;
    else awaitingCount++;
    if (e.amount != null && (highest == null || e.amount > highest.amount)) {
      highest = { ticker: e.ticker, amount: e.amount };
    }
  }

  return { thisWeekCount, confirmedCount, awaitingCount, highest };
}
