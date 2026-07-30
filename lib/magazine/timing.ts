/** "this week" / "next week" / "later this month" / "next month" framing
 * for a future date — real, computed timing (not a fabricated countdown),
 * the concrete answer to "이번주 배당" / "다음주 배당" / "TSLY dividend this
 * week" / "TSLY dividend next month"-style queries without minting a
 * separate page per week or month (see Magazine 3.0/4.0 scope notes:
 * freshening one URL's content beats new URLs per period). Calendar-month
 * aware beyond two weeks out, not just a day-count bucket — a payment 20
 * days away that crosses into next calendar month reads as "next month"
 * rather than "in about 3 weeks", matching how people actually ask.
 * Shared by sections.tsx (featured snippet, timeline, AI summary) and
 * faq.ts (so FAQ answers state this fact directly instead of pointing
 * elsewhere — self-contained answers are what Featured Snippet / AI
 * Overview extraction needs). */
export function describeTiming(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const targetUTC = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const diffDays = Math.round((targetUTC - todayUTC) / 86400000);
  if (diffDays < 0) return null;
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays <= 7) return "this week";
  if (diffDays <= 14) return "next week";
  const todayMonthIndex = today.getUTCFullYear() * 12 + today.getUTCMonth();
  const targetMonthIndex = target.getUTCFullYear() * 12 + target.getUTCMonth();
  if (targetMonthIndex === todayMonthIndex) return "later this month";
  if (targetMonthIndex === todayMonthIndex + 1) return "next month";
  if (diffDays <= 31) return `in about ${Math.round(diffDays / 7)} weeks`;
  return `in about ${Math.round(diffDays / 30)} months`;
}

export function describeTimingKo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const targetUTC = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const diffDays = Math.round((targetUTC - todayUTC) / 86400000);
  if (diffDays < 0) return null;
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "내일";
  if (diffDays <= 7) return "이번 주";
  if (diffDays <= 14) return "다음 주";
  const todayMonthIndex = today.getUTCFullYear() * 12 + today.getUTCMonth();
  const targetMonthIndex = target.getUTCFullYear() * 12 + target.getUTCMonth();
  if (targetMonthIndex === todayMonthIndex) return "이번 달 중";
  if (targetMonthIndex === todayMonthIndex + 1) return "다음 달";
  if (diffDays <= 31) return `약 ${Math.round(diffDays / 7)}주 후`;
  return `약 ${Math.round(diffDays / 30)}개월 후`;
}

/** "August 2026" style label — for a natural "{ticker} dividend {Month}
 * {Year}" phrase (a real target query per the Magazine 4.0 spec), distinct
 * from the ISO date already shown elsewhere on the page. */
export function monthYearLabel(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** "2026년 8월" style label — the KO equivalent, year-first per Korean
 * convention rather than a literal translation of the EN month-year order. */
export function monthYearLabelKo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ko-KR", { month: "long", year: "numeric", timeZone: "UTC" });
}
