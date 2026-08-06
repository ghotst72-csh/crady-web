import { describe, it, expect } from "vitest";
import { buildRiskContext, formatRiskItemValue } from "./riskExplain";

describe("buildRiskContext", () => {
  it("returns null when risk_level is missing — nothing to give context for", () => {
    expect(
      buildRiskContext({ riskLevel: null, volatility30d: 65, volatility90d: 47, maxDrawdown: -90, dividendStabilityScore: 88 })
    ).toBeNull();
  });

  it("includes only the metrics that are actually real, never a fabricated fallback", () => {
    const ctx = buildRiskContext({
      riskLevel: "EXTREME",
      volatility30d: 141.6,
      volatility90d: null,
      maxDrawdown: -94.9,
      dividendStabilityScore: null,
    })!;
    expect(ctx.riskLevel).toBe("EXTREME");
    expect(ctx.items.map((i) => i.key)).toEqual(["volatility30d", "maxDrawdown"]);
  });

  it("includes all four metrics when all are real", () => {
    const ctx = buildRiskContext({
      riskLevel: "NORMAL",
      volatility30d: 65.7,
      volatility90d: 47.3,
      maxDrawdown: -90.6,
      dividendStabilityScore: 88.9,
    })!;
    expect(ctx.items).toHaveLength(4);
  });
});

describe("formatRiskItemValue", () => {
  it("formats percentages and scores distinctly", () => {
    expect(formatRiskItemValue({ key: "volatility30d", value: 65.718288 })).toBe("65.7%");
    expect(formatRiskItemValue({ key: "dividendStability", value: 88.93 })).toBe("88.9/100");
  });
});
