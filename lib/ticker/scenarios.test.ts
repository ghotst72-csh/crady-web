import { describe, it, expect } from "vitest";
import { buildScenarios } from "./scenarios";

describe("buildScenarios", () => {
  it("returns null when there's no point estimate", () => {
    expect(buildScenarios({ pointEstimate: null, recentAmounts: [0.3, 0.31, 0.29, 0.32] })).toBeNull();
  });

  it("returns null below the minimum sample size (never a fabricated spread)", () => {
    expect(buildScenarios({ pointEstimate: 0.3, recentAmounts: [0.3, 0.31] })).toBeNull();
  });

  it("bull is above base, bear is below or equal, base equals the real point estimate", () => {
    const s = buildScenarios({ pointEstimate: 0.32, recentAmounts: [0.28, 0.3, 0.32, 0.36, 0.4] })!;
    expect(s.base.amount).toBe(0.32);
    expect(s.bull.amount).toBeGreaterThan(s.base.amount);
    expect(s.bear.amount).toBeLessThanOrEqual(s.base.amount);
  });

  it("bear never goes negative even with high variability", () => {
    const s = buildScenarios({ pointEstimate: 0.05, recentAmounts: [0.05, 0.5, 0.02, 0.6, 0.01] })!;
    expect(s.bear.amount).toBeGreaterThanOrEqual(0);
  });
});
