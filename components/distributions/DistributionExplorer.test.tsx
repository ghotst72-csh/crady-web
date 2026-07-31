import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DistributionExplorer } from "./DistributionExplorer";
import type { DistributionRow } from "@/lib/distributions/table";

function row(overrides: Partial<DistributionRow>): DistributionRow {
  return {
    ticker: "TEST",
    etfName: "Test ETF",
    providerId: "yieldmax",
    frequency: "Weekly",
    distributionPerShare: 0.1,
    distributionRate: 50,
    secYield30d: 3,
    rocPercent: 90,
    exDate: "2026-07-30",
    payDate: "2026-07-31",
    sourceUrl: "https://example.com",
    ...overrides,
  };
}

// A small representative fixture — not the only tickers the component
// supports (Part 4: quick-access chips must not hard-code the ticker set).
const ROWS: DistributionRow[] = [
  row({ ticker: "MSTY", distributionPerShare: 0.2222, distributionRate: 90.51 }),
  row({ ticker: "TSLY", distributionPerShare: 0.2147, distributionRate: 53.04 }),
  row({ ticker: "CONY", distributionPerShare: 0.2942, distributionRate: 75.03, frequency: "Monthly", providerId: "roundhill" }),
  row({ ticker: "ZZZZ", distributionPerShare: 0.05, distributionRate: 10 }),
];

describe("DistributionExplorer — desktop table", () => {
  it("renders a real semantic table with accessible column headers", () => {
    render(<DistributionExplorer rows={ROWS} lang="en" />);
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Ticker" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Distribution per Share" })).toBeInTheDocument();
  });

  it("ticker cells link to the correct ticker page, honoring basePath", () => {
    render(<DistributionExplorer rows={ROWS} lang="ko" basePath="/ko" />);
    // Popular tickers (MSTY included) now carry a "Popular" badge inside the
    // same link, so its accessible name is "MSTY Popular" — match by regex.
    const link = screen.getByRole("link", { name: /^MSTY/ });
    expect(link).toHaveAttribute("href", "/ko/msty");
  });

  it("filters rows via the search box", async () => {
    const user = userEvent.setup();
    render(<DistributionExplorer rows={ROWS} lang="en" />);
    await user.type(screen.getByRole("searchbox"), "msty");
    expect(screen.getAllByRole("link", { name: /^MSTY/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /^TSLY/ })).not.toBeInTheDocument();
  });

  it("filters by provider via a filter chip", async () => {
    const user = userEvent.setup();
    render(<DistributionExplorer rows={ROWS} lang="en" />);
    await user.click(screen.getByRole("button", { name: /roundhill/i }));
    expect(screen.getAllByRole("link", { name: /^CONY/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /^MSTY/ })).not.toBeInTheDocument();
  });

  it("re-sorts rows when the sort option changes", async () => {
    const user = userEvent.setup();
    render(<DistributionExplorer rows={ROWS} lang="en" />);
    await user.selectOptions(screen.getByLabelText("Sort by"), "Highest distribution rate");
    const table = screen.getByRole("table");
    const rowsInTable = within(table).getAllByRole("row").slice(1); // skip header row
    expect(within(rowsInTable[0]).getByText("MSTY")).toBeInTheDocument();
  });

  it("shows a no-results message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<DistributionExplorer rows={ROWS} lang="en" />);
    await user.type(screen.getByRole("searchbox"), "zzznotreal");
    expect(screen.getByText("No distributions match your search or filter.")).toBeInTheDocument();
  });

  it("shows popular ticker chips only for tickers actually present in the data", () => {
    const noMsty = ROWS.filter((r) => r.ticker !== "MSTY");
    render(<DistributionExplorer rows={noMsty} lang="en" />);
    expect(screen.queryByRole("button", { name: "MSTY" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TSLY" })).toBeInTheDocument();
  });

  it("supports any real ticker, not just the four suggested popular ones", async () => {
    const user = userEvent.setup();
    render(<DistributionExplorer rows={ROWS} lang="en" />);
    await user.type(screen.getByRole("searchbox"), "zzzz");
    expect(screen.getAllByRole("link", { name: "ZZZZ" }).length).toBeGreaterThan(0);
  });
});

describe("DistributionExplorer — mobile expansion", () => {
  it("expands a compact row on tap to reveal more fields, and collapses on second tap", async () => {
    const user = userEvent.setup();
    render(<DistributionExplorer rows={ROWS} lang="en" />);
    // Scoped by aria-expanded (present only on the row toggle) to avoid
    // matching the unrelated "MSTY" popular-ticker chip button.
    const trigger = screen.getByRole("button", { name: /MSTY/, expanded: false });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("View ticker page →")).toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
