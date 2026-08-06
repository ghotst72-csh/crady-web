import { describe, it, expect } from "vitest";
import { buildYieldExplanation, type YieldExplainInput } from "./yieldExplain";

const BASE: YieldExplainInput = {
  annualYieldPct: 73.6,
  payoutFrequency: "weekly",
  dividendTrend: "flat",
  dividendTrendPct: 0,
  recentReturn30d: -2,
};

describe("buildYieldExplanation", () => {
  it("returns null when there's no real yield to explain", () => {
    expect(buildYieldExplanation({ ...BASE, annualYieldPct: null })).toBeNull();
  });

  it("always includes the real formula sentence when yield exists", () => {
    const result = buildYieldExplanation(BASE, "en")!;
    expect(result.formula).toMatch(/90 days/);
  });

  it("flags weekly payout frequency as a factor", () => {
    const result = buildYieldExplanation(BASE, "en")!;
    expect(result.factors.some((f) => /[Ww]eekly/.test(f))).toBe(true);
  });

  it("flags a notable price decline as amplifying yield", () => {
    const result = buildYieldExplanation({ ...BASE, recentReturn30d: -23.2 }, "en")!;
    expect(result.factors.some((f) => /23\.2%/.test(f))).toBe(true);
  });

  it("flags a large recent distribution increase", () => {
    const result = buildYieldExplanation({ ...BASE, dividendTrend: "up", dividendTrendPct: 15 }, "en")!;
    expect(result.factors.some((f) => /15\.0%/.test(f))).toBe(true);
  });

  it("does not fabricate a price-move factor for a small, unremarkable move", () => {
    const result = buildYieldExplanation({ ...BASE, recentReturn30d: -3 }, "en")!;
    expect(result.factors.some((f) => /mechanically/.test(f))).toBe(false);
  });
});
