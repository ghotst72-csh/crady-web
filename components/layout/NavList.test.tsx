import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavList } from "./NavList";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

beforeEach(() => {
  pathname = "/";
});

describe("NavList", () => {
  it("renders Home plus every real section label", () => {
    render(<NavList lang="en" />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Dividend Predictions")).toBeInTheDocument();
    expect(screen.getByText("Dividends")).toBeInTheDocument();
    expect(screen.getByText("High-Yield ETFs")).toBeInTheDocument();
    expect(screen.getByText("My CRADY")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("renders a single-child section (Dividend Predictions) as one direct link, not an expandable group", () => {
    render(<NavList lang="en" />);
    const link = screen.getByText("Dividend Predictions").closest("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", "/next-dividend");
    // No nested "Next Dividend" child row underneath — the section label
    // itself IS the link.
    expect(screen.queryByText("Next Dividend")).not.toBeInTheDocument();
  });

  it("renders a multi-child section (Dividends) expanded by default with real hrefs", () => {
    render(<NavList lang="en" />);
    expect(screen.getByText("Latest Distributions").closest("a")).toHaveAttribute("href", "/distributions");
    expect(screen.getByText("Distribution Archive").closest("a")).toHaveAttribute("href", "/distributions/archive");
    expect(screen.getByText("Dividend Calendar").closest("a")).toHaveAttribute("href", "/calendar");
  });

  it("collapses and re-expands a multi-child group on click", async () => {
    const user = userEvent.setup();
    render(<NavList lang="en" />);
    expect(screen.getByText("Latest Distributions")).toBeInTheDocument();
    await user.click(screen.getByText("Dividends"));
    expect(screen.queryByText("Latest Distributions")).not.toBeInTheDocument();
    await user.click(screen.getByText("Dividends"));
    expect(screen.getByText("Latest Distributions")).toBeInTheDocument();
  });

  it("marks the exact current path as active via aria-current", () => {
    pathname = "/distributions";
    render(<NavList lang="en" />);
    expect(screen.getByText("Latest Distributions").closest("a")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Dividend Calendar").closest("a")).not.toHaveAttribute("aria-current");
  });

  it("marks a real sub-path (announcement detail) as active under its parent", () => {
    pathname = "/distributions/2026-08-05-yieldmax-group-2";
    render(<NavList lang="en" />);
    expect(screen.getByText("Latest Distributions").closest("a")).toHaveAttribute("aria-current", "page");
  });

  it("resolves Korean hrefs with the /ko prefix, except Magazine which stays English-only", () => {
    render(<NavList lang="ko" />);
    expect(screen.getByText("최신 분배금").closest("a")).toHaveAttribute("href", "/ko/distributions");
    expect(screen.getByText("매거진 (영문)").closest("a")).toHaveAttribute("href", "/magazine");
  });

  it("calls onNavigate when a link is clicked (drawer close-on-navigate wiring)", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<NavList lang="en" onNavigate={onNavigate} />);
    await user.click(screen.getByText("Latest Distributions"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("never renders a fabricated destination (Watchlist, Alerts, Prediction Accuracy, Screener)", () => {
    render(<NavList lang="en" />);
    for (const fake of ["Watchlist", "Alerts", "Prediction Accuracy", "Screener", "Upcoming Announcements"]) {
      expect(screen.queryByText(fake)).not.toBeInTheDocument();
    }
  });
});
