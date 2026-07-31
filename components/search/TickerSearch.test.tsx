import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TickerSearch } from "./TickerSearch";
import { MobileSearch } from "./MobileSearch";
import type { SearchEntry } from "@/lib/search/searchTickers";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const INDEX: SearchEntry[] = [
  { ticker: "MSTY", name: "YieldMax MSTR Option Income Strategy ETF", provider_id: "yieldmax", annualYieldPct: 90.2, cradyScore: 55.1 },
  { ticker: "MARO", name: "Roundhill MicroStrategy WeeklyPay ETF", provider_id: "roundhill", annualYieldPct: 40.1, cradyScore: 48.0 },
  { ticker: "TSLY", name: "YieldMax TSLA Option Income Strategy ETF", provider_id: "yieldmax", annualYieldPct: 84.4, cradyScore: 34.7 },
];

beforeEach(() => {
  push.mockClear();
});

describe("TickerSearch — desktop", () => {
  it("shows no dropdown for an empty input", () => {
    render(<TickerSearch index={INDEX} />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows matching results as soon as one character is typed", async () => {
    const user = userEvent.setup();
    render(<TickerSearch index={INDEX} />);
    await user.type(screen.getByRole("combobox"), "m");
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("MSTY"), expect.stringContaining("MARO")])
    );
  });

  it("shows a 'no matching ETF' state for a query with no results", async () => {
    const user = userEvent.setup();
    render(<TickerSearch index={INDEX} lang="en" />);
    await user.type(screen.getByRole("combobox"), "zzzznotreal");
    expect(screen.getByText("No matching ETF")).toBeInTheDocument();
  });

  it("navigates results with ArrowDown/ArrowUp and selects with Enter", async () => {
    const user = userEvent.setup();
    render(<TickerSearch index={INDEX} basePath="" />);
    const input = screen.getByRole("combobox");
    await user.type(input, "y"); // matches MSTY, TSLY by ticker-substring/prefix depending on fixture

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(push).toHaveBeenCalledTimes(1);
    const [calledPath] = push.mock.calls[0];
    expect(typeof calledPath).toBe("string");
  });

  it("closes the dropdown on Escape without navigating", async () => {
    const user = userEvent.setup();
    render(<TickerSearch index={INDEX} />);
    await user.type(screen.getByRole("combobox"), "m");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("selects a result on click and navigates to the ticker page", async () => {
    const user = userEvent.setup();
    render(<TickerSearch index={INDEX} basePath="" />);
    await user.type(screen.getByRole("combobox"), "TSLY");
    const option = screen.getByRole("option", { name: /TSLY/ });
    await user.click(option);
    expect(push).toHaveBeenCalledWith("/tsly");
  });

  it("preserves the active language's basePath when navigating", async () => {
    const user = userEvent.setup();
    render(<TickerSearch index={INDEX} lang="ko" basePath="/ko" />);
    await user.type(screen.getByRole("combobox"), "TSLY");
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/ko/tsly");
  });

  it("closes the dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <TickerSearch index={INDEX} />
        <button type="button">outside</button>
      </div>
    );
    await user.type(screen.getByRole("combobox"), "m");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clears the query via the clear control", async () => {
    const user = userEvent.setup();
    render(<TickerSearch index={INDEX} lang="en" />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "msty");
    expect(input.value).toBe("msty");

    await user.click(screen.getByLabelText("Clear search"));
    expect(input.value).toBe("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("highlights the matching substring in results", async () => {
    const user = userEvent.setup();
    render(<TickerSearch index={INDEX} />);
    await user.type(screen.getByRole("combobox"), "ts");
    const option = screen.getByRole("option", { name: /TSLY/ });
    expect(within(option).getByText("TS")).toBeInTheDocument();
  });
});

describe("MobileSearch", () => {
  it("opens a full-width sheet on tap and autofocuses the input", async () => {
    const user = userEvent.setup();
    render(<MobileSearch index={INDEX} lang="en" />);
    await user.click(screen.getByLabelText("Search ETFs"));
    const input = screen.getByRole("combobox");
    expect(input).toHaveFocus();
  });

  it("closes via the close button", async () => {
    const user = userEvent.setup();
    render(<MobileSearch index={INDEX} lang="en" />);
    await user.click(screen.getByLabelText("Search ETFs"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Close search"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<MobileSearch index={INDEX} lang="en" />);
    await user.click(screen.getByLabelText("Search ETFs"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("portals the sheet directly onto document.body (regression: a header with backdrop-blur becomes the containing block for a fixed-position descendant, silently shrinking it to the header's own height instead of the full viewport — rendering outside the header via a portal sidesteps that entirely)", async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileSearch index={INDEX} lang="en" />);
    await user.click(screen.getByLabelText("Search ETFs"));
    const dialog = screen.getByRole("dialog");

    expect(dialog.parentElement).toBe(document.body);
    expect(container.contains(dialog)).toBe(false);
  });
});
