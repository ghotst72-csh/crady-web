import type { OtpErrorInfo } from "@/lib/auth/otpErrors";

/** Explicit state machine for the sign-in modal — replaces the previous ad
 * hoc `step`/`submitting`/`error` boolean combination. Six phases, matching
 * exactly one screen/in-flight-state each: email (idle), sending (email
 * step, request in flight), otp (idle), verifying (otp step, request in
 * flight), display-name (first-ever sign-in only), authenticated (terminal
 * — triggers modal close). `error` is deliberately NOT one of the phases:
 * a verify failure must keep the user on the otp screen, so it has to be
 * able to coexist with `phase: "otp"` rather than replace it. */
export type Phase = "email" | "sending" | "otp" | "verifying" | "display-name" | "authenticated";

export type ModalState = {
  phase: Phase;
  /** Raw, editable value shown in the email input. */
  email: string;
  /** Frozen at the moment signInWithOtp last succeeded — verifyOtp always
   * reuses this exact string, never a fresh re-normalization of `email`,
   * so a send and its matching verify are guaranteed to use identical
   * values even if `email` were somehow mutated in between. */
  normalizedEmail: string;
  code: string;
  userId: string | null;
  error: OtpErrorInfo | null;
  resending: boolean;
  resendCooldownUntil: number | null;
};

export type ModalAction =
  | { type: "EMAIL_CHANGED"; email: string }
  | { type: "SEND_STARTED" }
  | { type: "SEND_SUCCEEDED"; normalizedEmail: string; cooldownUntil: number }
  | { type: "SEND_FAILED"; error: OtpErrorInfo }
  | { type: "CODE_CHANGED"; code: string }
  | { type: "VERIFY_STARTED" }
  | { type: "VERIFY_SUCCEEDED"; needsDisplayName: boolean; userId: string }
  | { type: "VERIFY_FAILED"; error: OtpErrorInfo }
  | { type: "RESEND_STARTED" }
  | { type: "RESEND_SUCCEEDED"; cooldownUntil: number }
  | { type: "RESEND_FAILED"; error: OtpErrorInfo }
  | { type: "BACK_TO_EMAIL" };

export const initialModalState: ModalState = {
  phase: "email",
  email: "",
  normalizedEmail: "",
  code: "",
  userId: null,
  error: null,
  resending: false,
  resendCooldownUntil: null,
};

export function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "EMAIL_CHANGED":
      if (state.phase !== "email") return state;
      return { ...state, email: action.email, error: null };

    case "SEND_STARTED":
      // Duplicate-request guard: only a fresh "email" phase can start a send.
      if (state.phase !== "email") return state;
      return { ...state, phase: "sending", error: null };

    case "SEND_SUCCEEDED":
      if (state.phase !== "sending") return state;
      return {
        ...state,
        phase: "otp",
        normalizedEmail: action.normalizedEmail,
        code: "",
        error: null,
        resendCooldownUntil: action.cooldownUntil,
      };

    case "SEND_FAILED":
      if (state.phase !== "sending") return state;
      return { ...state, phase: "email", error: action.error };

    case "CODE_CHANGED":
      if (state.phase !== "otp") return state;
      return { ...state, code: action.code, error: null };

    case "VERIFY_STARTED":
      // Duplicate-request guard: only an idle "otp" phase can start a verify.
      if (state.phase !== "otp") return state;
      return { ...state, phase: "verifying", error: null };

    case "VERIFY_SUCCEEDED":
      if (state.phase !== "verifying") return state;
      return action.needsDisplayName
        ? { ...state, phase: "display-name", userId: action.userId }
        : { ...state, phase: "authenticated" };

    case "VERIFY_FAILED":
      // Always returns to "otp", never "email" — a verify failure must
      // never be mistaken for a send failure.
      if (state.phase !== "verifying") return state;
      return { ...state, phase: "otp", error: action.error };

    case "RESEND_STARTED":
      if (state.phase !== "otp" || state.resending) return state;
      return { ...state, resending: true, error: null };

    case "RESEND_SUCCEEDED":
      if (!state.resending) return state;
      return { ...state, resending: false, code: "", error: null, resendCooldownUntil: action.cooldownUntil };

    case "RESEND_FAILED":
      if (!state.resending) return state;
      return { ...state, resending: false, error: action.error };

    case "BACK_TO_EMAIL":
      // Resets everything except the email address itself, which the user
      // is about to edit anyway.
      return { ...initialModalState, email: state.email };

    default:
      return state;
  }
}
