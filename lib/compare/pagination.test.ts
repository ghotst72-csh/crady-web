import { describe, it, expect, vi } from "vitest";
import { fetchAllPaginated, SUPABASE_PAGE_SIZE } from "./pagination";

function page(size: number, startAt = 0) {
  return Array.from({ length: size }, (_, i) => ({ id: startAt + i }));
}

describe("fetchAllPaginated", () => {
  it("returns everything from a single short page (below the cap)", async () => {
    const buildPage = vi.fn().mockResolvedValue({ data: page(37), error: null });
    const result = await fetchAllPaginated(buildPage);
    expect(result).toHaveLength(37);
    expect(buildPage).toHaveBeenCalledTimes(1);
    expect(buildPage).toHaveBeenCalledWith(0, SUPABASE_PAGE_SIZE - 1);
  });

  it("stops as soon as a page returns fewer rows than the page size", async () => {
    const buildPage = vi
      .fn()
      .mockResolvedValueOnce({ data: page(SUPABASE_PAGE_SIZE), error: null })
      .mockResolvedValueOnce({ data: page(1234), error: null });
    const result = await fetchAllPaginated(buildPage);
    expect(result).toHaveLength(SUPABASE_PAGE_SIZE + 1234);
    expect(buildPage).toHaveBeenCalledTimes(2);
    expect(buildPage).toHaveBeenNthCalledWith(2, SUPABASE_PAGE_SIZE, SUPABASE_PAGE_SIZE * 2 - 1);
  });

  it("keeps paginating through multiple full pages", async () => {
    const buildPage = vi
      .fn()
      .mockResolvedValueOnce({ data: page(SUPABASE_PAGE_SIZE), error: null })
      .mockResolvedValueOnce({ data: page(SUPABASE_PAGE_SIZE), error: null })
      .mockResolvedValueOnce({ data: page(1), error: null });
    const result = await fetchAllPaginated(buildPage);
    expect(result).toHaveLength(SUPABASE_PAGE_SIZE * 2 + 1);
    expect(buildPage).toHaveBeenCalledTimes(3);
  });

  it("handles a zero-row result cleanly", async () => {
    const buildPage = vi.fn().mockResolvedValue({ data: [], error: null });
    const result = await fetchAllPaginated(buildPage);
    expect(result).toEqual([]);
    expect(buildPage).toHaveBeenCalledTimes(1);
  });

  it("handles a null data field the same as empty", async () => {
    const buildPage = vi.fn().mockResolvedValue({ data: null, error: null });
    const result = await fetchAllPaginated(buildPage);
    expect(result).toEqual([]);
  });

  it("throws on a query error instead of silently returning partial data", async () => {
    const buildPage = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(fetchAllPaginated(buildPage)).rejects.toThrow("boom");
  });

  it("stops exactly at a page that is exactly the page size followed by an empty page (edge case: total rows is an exact multiple of the page size)", async () => {
    const buildPage = vi
      .fn()
      .mockResolvedValueOnce({ data: page(SUPABASE_PAGE_SIZE), error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    const result = await fetchAllPaginated(buildPage);
    expect(result).toHaveLength(SUPABASE_PAGE_SIZE);
    expect(buildPage).toHaveBeenCalledTimes(2);
  });
});
