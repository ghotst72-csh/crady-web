import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostComposer } from "./PostComposer";

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({ from }),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const openAuthModal = vi.fn();
let mockSession: { user: { id: string } } | null = null;
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ session: mockSession, loading: false, openAuthModal }),
}));

beforeEach(() => {
  mockSession = null;
  openAuthModal.mockReset();
  insert.mockReset().mockResolvedValue({ error: null });
  refresh.mockReset();
});

describe("PostComposer — content survives a mid-flow sign-in", () => {
  it("keeps typed content when submit opens the auth modal instead of clearing the form", async () => {
    const user = userEvent.setup();
    render(<PostComposer ticker="TSLY" />);
    await user.type(screen.getByPlaceholderText(/Share your question/i), "Will TSLY cut its dividend?");
    await user.click(screen.getByRole("button", { name: /sign in to post/i }));

    expect(openAuthModal).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
    // The composer is a separate, always-mounted component from the login
    // modal (portaled overlay) — its local text state is never touched by
    // the sign-in flow, so the draft must still be exactly what was typed.
    expect(screen.getByPlaceholderText(/Share your question/i)).toHaveValue("Will TSLY cut its dividend?");
  });

  it("posts the preserved content once a session becomes available and the user submits again", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PostComposer ticker="TSLY" />);
    await user.type(screen.getByPlaceholderText(/Share your question/i), "Will TSLY cut its dividend?");
    await user.click(screen.getByRole("button", { name: /sign in to post/i }));
    expect(insert).not.toHaveBeenCalled();

    // Simulate AuthProvider's onAuthStateChange picking up a completed
    // sign-in from the modal — PostComposer re-renders with a real session.
    mockSession = { user: { id: "u1" } };
    rerender(<PostComposer ticker="TSLY" />);
    expect(screen.getByPlaceholderText(/Share your question/i)).toHaveValue("Will TSLY cut its dividend?");

    await user.click(screen.getByRole("button", { name: /^post$/i }));
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: "TSLY", user_id: "u1", body: "Will TSLY cut its dividend?" })
    );
  });
});
