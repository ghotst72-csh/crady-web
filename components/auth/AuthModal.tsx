"use client";

import { useEffect, useReducer, useState } from "react";
import { createPortal } from "react-dom";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { classifySendError, classifyVerifyError, isWellFormedOtpCode } from "@/lib/auth/otpErrors";
import { logAuthEvent } from "@/lib/auth/authLog";
import { modalReducer, initialModalState } from "./authModalReducer";
import { DisplayNamePrompt } from "./DisplayNamePrompt";

const T = {
  title: { en: "Sign in to CRADY", ko: "CRADY 로그인" },
  closeLabel: { en: "Close", ko: "닫기" },
  emailLabel: { en: "Email", ko: "이메일" },
  emailPlaceholder: { en: "you@example.com", ko: "you@example.com" },
  sendCode: { en: "Send code", ko: "인증코드 보내기" },
  sending: { en: "Sending…", ko: "전송 중…" },
  codeSentTo: { en: "We sent a code to", ko: "인증코드를 발송했습니다:" },
  codeLabel: { en: "Verification code", ko: "인증코드" },
  codePlaceholder: { en: "123456", ko: "123456" },
  verify: { en: "Verify", ko: "확인" },
  verifying: { en: "Verifying…", ko: "확인 중…" },
  resend: { en: "Resend code", ko: "코드 재전송" },
  resendIn: { en: "Resend code", ko: "재전송" },
  resending: { en: "Sending…", ko: "전송 중…" },
  useAnotherEmail: { en: "Use a different email", ko: "다른 이메일 사용" },
  sameAccount: {
    en: "This is the same account you'd use in the CRADY app.",
    ko: "CRADY 앱에서 사용하는 것과 동일한 계정입니다.",
  },
  invalidEmail: { en: "Enter a valid email address.", ko: "올바른 이메일 주소를 입력해주세요." },
} as const;

const INPUT_CLASS =
  "w-full rounded-full border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-2.5 text-sm focus:bg-white focus:border-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]";

const RESEND_COOLDOWN_MS = 30_000;

/** Ticks once a second while a cooldown is active, otherwise never
 * re-renders — avoids a perpetual interval outside the small window where
 * the resend button is actually counting down. */
function useCooldownRemainingMs(cooldownUntil: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (cooldownUntil == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);
  if (cooldownUntil == null) return 0;
  return Math.max(0, cooldownUntil - now);
}

/** The site's one modal, reusing MobileSearch.tsx's exact createPortal
 * pattern (portaled to document.body, Escape-to-close, body scroll lock) —
 * no separate Dialog component exists anywhere else in the repo, so this
 * doesn't introduce a second pattern. Email OTP only (no password field),
 * matching the mobile app's real sign-in flow
 * (lib/v2/services/auth_service.dart: signInWithOtp/verifyOTP) so an
 * existing app account works here unchanged.
 *
 * State transitions go through `modalReducer` (authModalReducer.ts) rather
 * than ad hoc booleans — see that file for the full phase list and the
 * guarantees each transition enforces (no duplicate sends, a verify failure
 * never masquerades as a send failure, editing the email clears stale
 * errors, etc). */
export function AuthModal({
  lang = "en",
  onClose,
}: {
  lang?: "en" | "ko";
  onClose: () => void;
}) {
  const [state, dispatch] = useReducer(modalReducer, initialModalState);
  const { phase, email, normalizedEmail, code, userId, error, resending, resendCooldownUntil } = state;
  const resendRemainingMs = useCooldownRemainingMs(resendCooldownUntil);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (phase === "authenticated") onClose();
  }, [phase, onClose]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "email") return; // duplicate-submit guard
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      dispatch({ type: "SEND_FAILED", error: { kind: "invalid", message: { en: T.invalidEmail.en, ko: T.invalidEmail.ko }, raw: {} } });
      return;
    }
    const target = email.trim().toLowerCase();
    dispatch({ type: "SEND_STARTED" });
    const supabase = createBrowserSupabaseClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: target,
      options: { shouldCreateUser: true },
    });
    logAuthEvent({
      call: "signInWithOtp",
      phase: "sending",
      email: target,
      emailWasNormalized: target !== email,
      otpType: "email",
      error: otpError
        ? { name: otpError.name, message: otpError.message, status: otpError.status, code: (otpError as { code?: string }).code }
        : undefined,
    });
    if (otpError) {
      dispatch({ type: "SEND_FAILED", error: classifySendError(otpError) });
      return;
    }
    dispatch({ type: "SEND_SUCCEEDED", normalizedEmail: target, cooldownUntil: Date.now() + RESEND_COOLDOWN_MS });
  }

  async function handleResend() {
    if (phase !== "otp" || resending || resendRemainingMs > 0) return; // duplicate-submit + cooldown guard
    dispatch({ type: "RESEND_STARTED" });
    const supabase = createBrowserSupabaseClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    });
    logAuthEvent({
      call: "resend",
      phase: "otp",
      email: normalizedEmail,
      emailWasNormalized: false,
      otpType: "email",
      error: otpError
        ? { name: otpError.name, message: otpError.message, status: otpError.status, code: (otpError as { code?: string }).code }
        : undefined,
    });
    if (otpError) {
      dispatch({ type: "RESEND_FAILED", error: classifySendError(otpError) });
      return;
    }
    dispatch({ type: "RESEND_SUCCEEDED", cooldownUntil: Date.now() + RESEND_COOLDOWN_MS });
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "otp") return; // duplicate-submit guard
    if (!isWellFormedOtpCode(code)) return; // client-side pre-check — never call the API with junk input
    dispatch({ type: "VERIFY_STARTED" });
    const supabase = createBrowserSupabaseClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: "email",
    });
    logAuthEvent({
      call: "verifyOtp",
      phase: "verifying",
      email: normalizedEmail,
      emailWasNormalized: false,
      otpType: "email",
      error: verifyError
        ? { name: verifyError.name, message: verifyError.message, status: verifyError.status, code: (verifyError as { code?: string }).code }
        : undefined,
    });
    if (verifyError || !data.user) {
      dispatch({
        type: "VERIFY_FAILED",
        error: verifyError
          ? classifyVerifyError(verifyError)
          : { kind: "invalid", message: { en: "That code didn't work. Check it and try again.", ko: "코드가 올바르지 않습니다." }, raw: {} },
      });
      return;
    }

    const { data: profile } = await supabase
      .from("activity_profiles")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    dispatch({ type: "VERIFY_SUCCEEDED", needsDisplayName: !profile, userId: data.user.id });
  }

  const resendRemainingSec = Math.ceil(resendRemainingMs / 1000);
  const showEmailStep = phase === "email" || phase === "sending";
  const showOtpStep = phase === "otp" || phase === "verifying";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={T.title[lang]}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">{T.title[lang]}</h2>
          <button
            type="button"
            aria-label={T.closeLabel[lang]}
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--gray-500)] hover:bg-[var(--gray-100)] transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {showEmailStep && (
          <form onSubmit={handleSendCode} className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--gray-600)]">{T.emailLabel[lang]}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => dispatch({ type: "EMAIL_CHANGED", email: e.target.value })}
                placeholder={T.emailPlaceholder[lang]}
                autoFocus
                className={`${INPUT_CLASS} mt-1`}
              />
            </label>
            {error && <p className="text-sm text-red-700">{error.message[lang]}</p>}
            <button
              type="submit"
              disabled={phase === "sending"}
              className="w-full rounded-full bg-black text-white text-sm font-semibold py-2.5 disabled:opacity-40 transition-opacity"
            >
              {phase === "sending" ? T.sending[lang] : T.sendCode[lang]}
            </button>
            <p className="text-xs text-[var(--gray-500)]">{T.sameAccount[lang]}</p>
          </form>
        )}

        {showOtpStep && (
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <p className="text-sm text-[var(--gray-600)]">
              {T.codeSentTo[lang]} <span className="font-semibold text-black">{normalizedEmail}</span>
            </p>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--gray-600)]">{T.codeLabel[lang]}</span>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => dispatch({ type: "CODE_CHANGED", code: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder={T.codePlaceholder[lang]}
                autoFocus
                className={`${INPUT_CLASS} mt-1 tracking-widest text-center`}
              />
            </label>
            {error && <p className="text-sm text-red-700">{error.message[lang]}</p>}
            <button
              type="submit"
              disabled={phase === "verifying" || !isWellFormedOtpCode(code)}
              className="w-full rounded-full bg-black text-white text-sm font-semibold py-2.5 disabled:opacity-40 transition-opacity"
            >
              {phase === "verifying" ? T.verifying[lang] : T.verify[lang]}
            </button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => dispatch({ type: "BACK_TO_EMAIL" })}
                className="text-xs text-[var(--gray-500)] hover:text-black transition-colors"
              >
                {T.useAnotherEmail[lang]}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendRemainingMs > 0}
                className="text-xs text-[var(--gray-500)] hover:text-black transition-colors disabled:opacity-40 disabled:hover:text-[var(--gray-500)]"
              >
                {resending
                  ? T.resending[lang]
                  : resendRemainingMs > 0
                    ? `${T.resendIn[lang]} (0:${String(resendRemainingSec).padStart(2, "0")})`
                    : T.resend[lang]}
              </button>
            </div>
          </form>
        )}

        {phase === "display-name" && userId && (
          <DisplayNamePrompt userId={userId} lang={lang} onDone={onClose} />
        )}
      </div>
    </div>,
    document.body
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
