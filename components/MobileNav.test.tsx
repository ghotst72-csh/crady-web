import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNav } from "./MobileNav";

describe("MobileNav", () => {
  it("renders a hamburger trigger with an accessible label", () => {
    render(<MobileNav lang="en" />);
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });

  it("opens a menu listing the English nav items on tap", async () => {
    const user = userEvent.setup();
    render(<MobileNav lang="en" />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Ranking" })).toHaveAttribute("href", "/ranking");
    expect(screen.getByRole("menuitem", { name: "Calendar" })).toHaveAttribute("href", "/calendar");
    expect(screen.getByRole("menuitem", { name: "Magazine" })).toHaveAttribute("href", "/magazine");
    expect(screen.getByRole("menuitem", { name: "About" })).toHaveAttribute("href", "/about");
  });

  it("shows the Korean nav items (with /ko-prefixed hrefs, Magazine excepted) on the Korean tree", async () => {
    const user = userEvent.setup();
    render(<MobileNav lang="ko" />);
    await user.click(screen.getByRole("button", { name: "메뉴 열기" }));

    expect(screen.getByRole("menuitem", { name: "랭킹" })).toHaveAttribute("href", "/ko/ranking");
    expect(screen.getByRole("menuitem", { name: "배당 일정" })).toHaveAttribute("href", "/ko/calendar");
    expect(screen.getByRole("menuitem", { name: "매거진" })).toHaveAttribute("href", "/magazine");
    expect(screen.getByRole("menuitem", { name: "소개" })).toHaveAttribute("href", "/ko/about");
  });

  it("closes the menu on Escape", async () => {
    const user = userEvent.setup();
    render(<MobileNav lang="en" />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <MobileNav lang="en" />
        <button type="button">outside</button>
      </div>
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByText("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu after selecting an item", async () => {
    const user = userEvent.setup();
    render(<MobileNav lang="en" />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.click(screen.getByRole("menuitem", { name: "About" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
