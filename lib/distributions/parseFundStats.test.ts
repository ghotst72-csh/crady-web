import { describe, it, expect } from "vitest";
import { parseFundStats } from "./parseFundStats";

// A trimmed-down but structurally faithful fragment of the real
// yieldmaxetfs.com/our-etfs/{ticker}/ markup (captured live 2026-07-31) —
// value-heading-div immediately followed by a label <h2>, repeated.
function fixture(distRate: string, secYield: string, asOf = "07/29/2026") {
  return `
    <div class="elementor-element elementor-widget elementor-widget-heading" data-id="7c7b693">
      <div class="elementor-widget-container">
        <div class="elementor-heading-title elementor-size-default">${distRate}</div>				</div>
      </div>
    <div class="elementor-element elementor-element-b63d641 elementor-widget elementor-widget-heading" data-id="b63d641">
      <div class="elementor-widget-container">
        <h2 class="elementor-heading-title elementor-size-default">Distribution Rate*</h2>				</div>
      </div>
      </div>
    <div class="elementor-element elementor-element-ff7d13f e-con-full e-flex e-con e-child" data-id="ff7d13f">
        <div class="elementor-element elementor-element-4d287ef elementor-widget elementor-widget-heading" data-id="4d287ef">
        <div class="elementor-widget-container">
          <div class="elementor-heading-title elementor-size-default">${secYield}</div>				</div>
        </div>
        <div class="elementor-element elementor-element-d53e54f elementor-widget elementor-widget-heading" data-id="d53e54f">
        <div class="elementor-widget-container">
          <h2 class="elementor-heading-title elementor-size-default">30-Day SEC Yield**</h2>				</div>
        </div>
        </div>
        </div>
        <div class="elementor-element elementor-element-dcab6b3 elementor-widget elementor-widget-heading" data-id="dcab6b3">
        <div class="elementor-widget-container">
          <div class="elementor-heading-title elementor-size-default">As of: ${asOf}</div>				</div>
        </div>
  `;
}

describe("parseFundStats", () => {
  it("extracts distribution rate and 30-day SEC yield from a real page shape", () => {
    const html = fixture("90.51%", "3.26%");
    expect(parseFundStats(html)).toEqual({ distributionRate: 90.51, secYield30d: 3.26 });
  });

  it("generalizes across different tickers' actual values", () => {
    expect(parseFundStats(fixture("53.04%", "2.52%"))).toEqual({
      distributionRate: 53.04,
      secYield30d: 2.52,
    });
    expect(parseFundStats(fixture("91.69%", "1.51%"))).toEqual({
      distributionRate: 91.69,
      secYield30d: 1.51,
    });
  });

  it("returns nulls when the expected labels are absent (page layout changed)", () => {
    expect(parseFundStats("<html><body>nothing here</body></html>")).toEqual({
      distributionRate: null,
      secYield30d: null,
    });
  });

  it("rejects an implausible value rather than writing bad data (e.g. mis-paired match)", () => {
    // A value like "5000%" is outside the plausible 0-500% band — treated as
    // a parsing/pairing failure, not written as real fund data.
    const html = fixture("5000%", "3.26%");
    expect(parseFundStats(html).distributionRate).toBeNull();
    expect(parseFundStats(html).secYield30d).toBe(3.26);
  });

  it("is not confused by unrelated value/label pairs elsewhere on the page", () => {
    const html = `
      <div class="elementor-widget-container"><div class="elementor-heading-title elementor-size-default">$1.23B</div></div>
      <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Net Assets</h2></div>
    ` + fixture("90.51%", "3.26%");
    expect(parseFundStats(html)).toEqual({ distributionRate: 90.51, secYield30d: 3.26 });
  });

  it("takes only the first occurrence when a label appears more than once", () => {
    const html = fixture("90.51%", "3.26%") + fixture("11.11%", "9.99%");
    expect(parseFundStats(html)).toEqual({ distributionRate: 90.51, secYield30d: 3.26 });
  });
});
