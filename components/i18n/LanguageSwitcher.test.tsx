import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSwitcher } from "./LanguageSwitcher";

let pathname = "/tsly";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

const setStoredLanguagePreference = vi.fn();
vi.mock("@/lib/i18n/preference", () => ({
  setStoredLanguagePreference: (...args: unknown[]) => setStoredLanguagePreference(...args),
}));

function stubLocation() {
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: { href: "" },
  });
}

beforeEach(() => {
  pathname = "/tsly";
  setStoredLanguagePreference.mockClear();
  stubLocation();
});

describe("LanguageSwitcher — desktop", () => {
  it("shows the current language on the trigger", () => {
    render(<LanguageSwitcher lang="en" />);
    expect(screen.getByRole("button")).toHaveTextContent("EN");
  });

  it("opens a menu listing both languages with the active one checked", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher lang="en" />);
    await user.click(screen.getByRole("button"));

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    const english = screen.getByRole("menuitemradio", { name: /English/ });
    const korean = screen.getByRole("menuitemradio", { name: /한국어/ });
    expect(english).toHaveAttribute("aria-checked", "true");
    expect(korean).toHaveAttribute("aria-checked", "false");
  });

  it("closes the menu on Escape", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher lang="en" />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LanguageSwitcher lang="en" />
        <button type="button">outside</button>
      </div>
    );
    await user.click(screen.getByRole("button", { name: /EN/ }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByText("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("stores the preference and navigates to the current page's Korean equivalent when switching to Korean", async () => {
    const user = userEvent.setup();
    pathname = "/tsly";
    render(<LanguageSwitcher lang="en" />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("menuitemradio", { name: /한국어/ }));

    expect(setStoredLanguagePreference).toHaveBeenCalledWith("ko");
    expect(window.location.href).toBe("/ko/tsly");
  });

  it("preserves /about when switching to Korean", async () => {
    const user = userEvent.setup();
    pathname = "/about";
    render(<LanguageSwitcher lang="en" />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("menuitemradio", { name: /한국어/ }));

    expect(window.location.href).toBe("/ko/about");
  });

  it("stores the preference without navigating when choosing the already-active language", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher lang="en" />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("menuitemradio", { name: /English/ }));

    expect(setStoredLanguagePreference).toHaveBeenCalledWith("en");
    expect(window.location.href).toBe("");
  });

  it("navigates back from Korean to the equivalent English page", async () => {
    const user = userEvent.setup();
    pathname = "/ko/ranking";
    render(<LanguageSwitcher lang="ko" />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("menuitemradio", { name: /English/ }));

    expect(setStoredLanguagePreference).toHaveBeenCalledWith("en");
    expect(window.location.href).toBe("/ranking");
  });
});

describe("LanguageSwitcher — compact (mobile)", () => {
  it("renders an icon-only trigger with an accessible label", () => {
    render(<LanguageSwitcher lang="en" compact />);
    expect(screen.getByRole("button", { name: "Change language" })).toBeInTheDocument();
  });

  it("still opens the full menu on tap", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher lang="en" compact />);
    await user.click(screen.getByRole("button", { name: "Change language" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
