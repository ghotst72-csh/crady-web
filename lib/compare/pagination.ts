/** Pure pagination helper, deliberately kept in its own file separate from
 * data.ts (which imports the live Supabase client at module load) so it
 * can be unit-tested without needing real Supabase credentials — same
 * pure/IO-boundary split convention already used elsewhere in this
 * codebase (e.g. historicalReturnCalc.ts vs historicalReturn.ts). */

/** This Supabase project hard-caps every request at 5,000 rows regardless
 * of what `.limit()` requests — confirmed empirically (`.limit(30000)`
 * still returned exactly 5,000 rows against a ~29k-row table). Any fetch
 * spanning more than a short period/ticker-set MUST paginate through
 * fetchAllPaginated below rather than relying on a single `.limit()`
 * call, or long periods would silently return truncated (wrong) data
 * with no error. */
export const SUPABASE_PAGE_SIZE = 5000;

export async function fetchAllPaginated<T>(
  buildPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildPage(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    all.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }
  return all;
}
