import { describe, it, expect } from "vitest";
import { resolveComparePeriod, findClosestAvailablePreset, approximateDurationLabel } from "./period";

const TODAY = "2026-08-15";

describe("resolveComparePeriod", () => {
  it("1M", () => {
    expect(resolveComparePeriod({ preset: "1M" }, TODAY)).toEqual({ startDate: "2026-07-15", endDate: TODAY });
  });

  it("3M", () => {
    expect(resolveComparePeriod({ preset: "3M" }, TODAY)).toEqual({ startDate: "2026-05-15", endDate: TODAY });
  });

  it("6M", () => {
    expect(resolveComparePeriod({ preset: "6M" }, TODAY)).toEqual({ startDate: "2026-02-15", endDate: TODAY });
  });

  it("YTD — January 1st of the endpoint's own year", () => {
    expect(resolveComparePeriod({ preset: "YTD" }, TODAY)).toEqual({ startDate: "2026-01-01", endDate: TODAY });
  });

  it("1Y", () => {
    expect(resolveComparePeriod({ preset: "1Y" }, TODAY)).toEqual({ startDate: "2025-08-15", endDate: TODAY });
  });

  it("3Y", () => {
    expect(resolveComparePeriod({ preset: "3Y" }, TODAY)).toEqual({ startDate: "2023-08-15", endDate: TODAY });
  });

  it("5Y", () => {
    expect(resolveComparePeriod({ preset: "5Y" }, TODAY)).toEqual({ startDate: "2021-08-15", endDate: TODAY });
  });

  it("custom — valid start/end within range", () => {
    expect(resolveComparePeriod({ preset: "custom", customStart: "2024-01-01", customEnd: "2024-12-31" }, TODAY)).toEqual({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });
  });

  it("custom — rejects end before start", () => {
    expect(resolveComparePeriod({ preset: "custom", customStart: "2024-12-31", customEnd: "2024-01-01" }, TODAY)).toBeNull();
  });

  it("custom — rejects an end date in the future", () => {
    expect(resolveComparePeriod({ preset: "custom", customStart: "2024-01-01", customEnd: "2027-01-01" }, TODAY)).toBeNull();
  });

  it("custom — rejects malformed date strings", () => {
    expect(resolveComparePeriod({ preset: "custom", customStart: "not-a-date", customEnd: "2024-12-31" }, TODAY)).toBeNull();
    expect(resolveComparePeriod({ preset: "custom", customStart: "2024-01-01", customEnd: "12/31/2024" }, TODAY)).toBeNull();
  });

  it("custom — allows the end date to equal today", () => {
    expect(resolveComparePeriod({ preset: "custom", customStart: "2024-01-01", customEnd: TODAY }, TODAY)).toEqual({
      startDate: "2024-01-01",
      endDate: TODAY,
    });
  });

  it("handles a leap-year YTD boundary correctly (deterministic, no live clock)", () => {
    expect(resolveComparePeriod({ preset: "YTD" }, "2024-02-29")).toEqual({ startDate: "2024-01-01", endDate: "2024-02-29" });
  });
});

describe("findClosestAvailablePreset", () => {
  it("suggests the longest preset that fully fits the available history", () => {
    // ~3 years of history available (2023-08-15 -> today) — 3Y fits
    // exactly, 5Y does not.
    const r = findClosestAvailablePreset("2023-08-15", TODAY);
    expect(r).toEqual({ kind: "preset", preset: "3Y" });
  });

  it("suggests 1Y when history barely exceeds it but not 3Y", () => {
    const r = findClosestAvailablePreset("2025-06-01", TODAY); // ~14.5 months back
    expect(r).toEqual({ kind: "preset", preset: "1Y" });
  });

  it("suggests 1M when history is short but slightly more than a month", () => {
    // 1M resolves to exactly TODAY minus 1 month = 2026-07-15; anything
    // at or before that (but after the 3M cutoff of 2026-05-15) fits 1M
    // and nothing longer.
    const r = findClosestAvailablePreset("2026-07-10", TODAY);
    expect(r).toEqual({ kind: "preset", preset: "1M" });
  });

  it("falls back to a custom range when not even 1M of history fits", () => {
    const r = findClosestAvailablePreset("2026-08-14", TODAY); // 1 day back
    expect(r).toEqual({ kind: "custom", customStart: "2026-08-14", customEnd: TODAY });
  });

  it("returns null when there is no usable window at all", () => {
    expect(findClosestAvailablePreset(TODAY, TODAY)).toBeNull();
    expect(findClosestAvailablePreset("2026-09-01", TODAY)).toBeNull();
  });

  it("suggests 5Y when the full 5-year window and beyond is available", () => {
    const r = findClosestAvailablePreset("2018-01-01", TODAY);
    expect(r).toEqual({ kind: "preset", preset: "5Y" });
  });
});

describe("approximateDurationLabel", () => {
  it("labels a multi-year span in years", () => {
    expect(approximateDurationLabel("2023-08-15", TODAY)).toBe("~3Y");
  });

  it("labels a sub-year span in months", () => {
    expect(approximateDurationLabel("2026-01-15", TODAY)).toBe("~7M");
  });

  it("never reports 0 months for a short but real span", () => {
    expect(approximateDurationLabel("2026-08-01", TODAY)).toBe("~1M");
  });

  it("rounds a fractional year to one decimal place", () => {
    // 2021-08-15 -> 2026-08-15 is exactly 5 years = 60 months
    expect(approximateDurationLabel("2021-08-15", TODAY)).toBe("~5Y");
    // 2021-02-15 -> 2026-08-15 is 66 months = 5.5 years
    expect(approximateDurationLabel("2021-02-15", TODAY)).toBe("~5.5Y");
  });
});
