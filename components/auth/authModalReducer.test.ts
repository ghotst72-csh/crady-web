import { describe, it, expect } from "vitest";
import { modalReducer, initialModalState, type ModalState } from "./authModalReducer";
import type { OtpErrorInfo } from "@/lib/auth/otpErrors";

const dummyError: OtpErrorInfo = {
  kind: "invalid",
  message: { en: "bad code", ko: "잘못된 코드" },
  raw: {},
};

function at(phase: ModalState["phase"], overrides: Partial<ModalState> = {}): ModalState {
  return { ...initialModalState, phase, ...overrides };
}

describe("modalReducer", () => {
  it("moves from email to otp only after SEND_SUCCEEDED", () => {
    const sent = modalReducer(at("sending"), {
      type: "SEND_SUCCEEDED",
      normalizedEmail: "a@b.com",
      cooldownUntil: 1000,
    });
    expect(sent.phase).toBe("otp");
    expect(sent.normalizedEmail).toBe("a@b.com");
  });

  it("ignores SEND_STARTED while already sending or verifying (duplicate-click guard)", () => {
    const s1 = modalReducer(at("sending"), { type: "SEND_STARTED" });
    expect(s1.phase).toBe("sending");
    const s2 = modalReducer(at("verifying"), { type: "SEND_STARTED" });
    expect(s2.phase).toBe("verifying");
  });

  it("ignores VERIFY_STARTED unless phase is otp (duplicate-click guard)", () => {
    const s1 = modalReducer(at("verifying"), { type: "VERIFY_STARTED" });
    expect(s1.phase).toBe("verifying");
    const s2 = modalReducer(at("email"), { type: "VERIFY_STARTED" });
    expect(s2.phase).toBe("email");
  });

  it("a verify failure returns to otp, never to email, and carries the error", () => {
    const result = modalReducer(at("verifying"), { type: "VERIFY_FAILED", error: dummyError });
    expect(result.phase).toBe("otp");
    expect(result.error).toBe(dummyError);
  });

  it("a send failure returns to email and never shows on the otp screen", () => {
    const result = modalReducer(at("sending"), { type: "SEND_FAILED", error: dummyError });
    expect(result.phase).toBe("email");
    expect(result.error).toBe(dummyError);
  });

  it("resending clears any existing error immediately", () => {
    const withError = at("otp", { error: dummyError });
    const result = modalReducer(withError, { type: "RESEND_STARTED" });
    expect(result.error).toBeNull();
    expect(result.resending).toBe(true);
  });

  it("a successful resend clears the stale code and sets a new cooldown", () => {
    const mid = at("otp", { resending: true, code: "12345678" });
    const result = modalReducer(mid, { type: "RESEND_SUCCEEDED", cooldownUntil: 5000 });
    expect(result.code).toBe("");
    expect(result.resendCooldownUntil).toBe(5000);
    expect(result.resending).toBe(false);
  });

  it("a failed resend surfaces its own error without leaving the otp phase", () => {
    const mid = at("otp", { resending: true });
    const result = modalReducer(mid, { type: "RESEND_FAILED", error: dummyError });
    expect(result.phase).toBe("otp");
    expect(result.error).toBe(dummyError);
    expect(result.resending).toBe(false);
  });

  it("going back to email resets code, error, and cooldown but preserves the typed email", () => {
    const mid = at("otp", {
      email: "user@example.com",
      code: "654321",
      error: dummyError,
      resendCooldownUntil: 9999,
    });
    const result = modalReducer(mid, { type: "BACK_TO_EMAIL" });
    expect(result.phase).toBe("email");
    expect(result.email).toBe("user@example.com");
    expect(result.code).toBe("");
    expect(result.error).toBeNull();
    expect(result.resendCooldownUntil).toBeNull();
  });

  it("editing the email clears any previous error", () => {
    const mid = at("email", { error: dummyError });
    const result = modalReducer(mid, { type: "EMAIL_CHANGED", email: "new@example.com" });
    expect(result.email).toBe("new@example.com");
    expect(result.error).toBeNull();
  });

  it("routes to display-name only for a first-ever sign-in, otherwise straight to authenticated", () => {
    const withProfile = modalReducer(at("verifying"), {
      type: "VERIFY_SUCCEEDED",
      needsDisplayName: false,
      userId: "u1",
    });
    expect(withProfile.phase).toBe("authenticated");

    const firstTime = modalReducer(at("verifying"), {
      type: "VERIFY_SUCCEEDED",
      needsDisplayName: true,
      userId: "u2",
    });
    expect(firstTime.phase).toBe("display-name");
    expect(firstTime.userId).toBe("u2");
  });
});
