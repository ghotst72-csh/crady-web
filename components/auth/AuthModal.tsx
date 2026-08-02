"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { DisplayNamePrompt } from "./DisplayNamePrompt";

const T = {
  title: { en: "Sign in to CRADY", ko: "CRADY 로그인" },
  closeLabel: { en: "Close", ko: "닫기" },
  emailLabel: { en: "Email", ko: "이메일" },
  emailPlaceholder: { en: "you@example.com", ko: "you@example.com" },
  sendCode: { en: "Send code", ko: "인증코드 보내기" },
  sending: { en: "Sending…", ko: "전송 중…" },
  codeSentTo: { en: "We sent a 6-digit code to", ko: "인증코드를 발송했습니다:" },
  codeLabel: { en: "Verification code", ko: "인증코드" },
  codePlaceholder: { en: "123456", ko: "123456" },
  verify: { en: "Verify", ko: "확인" },
  verifying: { en: "Verifying…", ko: "확인 중…" },
  useAnotherEmail: { en: "Use a different email", ko: "다른 이메일 사용" },
  sameAccount: {
    en: "This is the same account you'd use in the CRADY app.",
    ko: "CRADY 앱에서 사용하는 것과 동일한 계정입니다.",
  },
  invalidEmail: { en: "Enter a valid email address.", ko: "올바른 이메일 주소를 입력해주세요." },
  sendFailed: { en: "Couldn't send the code. Try again.", ko: "코드를 보내지 못했습니다. 다시 시도해주세요." },
  invalidCode: { en: "That code didn't work. Check it and try again.", ko: "코드가 올바르지 않습니다. 다시 확인해주세요." },
} as const;

const INPUT_CLASS =
  "w-full rounded-full border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-2.5 text-sm focus:bg-white focus:border-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--crady-accent)]";

type Step = "email" | "otp" | "display-name";

/** The site's one modal, reusing MobileSearch.tsx's exact createPortal
 * pattern (portaled to document.body, Escape-to-close, body scroll lock) —
 * no separate Dialog component exists anywhere else in the repo, so this
 * doesn't introduce a second pattern. Email OTP only (no password field),
 * matching the mobile app's real sign-in flow exactly
 * (lib/v2/services/auth_service.dart: signInWithOtp/verifyOTP) so an
 * existing app account works here unchanged. */
export function AuthModal({
  lang = "en",
  onClose,
}: {
  lang?: "en" | "ko";
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(T.invalidEmail[lang]);
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setSubmitting(false);
    if (otpError) {
      setError(T.sendFailed[lang]);
      return;
    }
    setStep("otp");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (verifyError || !data.user) {
      setSubmitting(false);
      setError(T.invalidCode[lang]);
      return;
    }

    const { data: profile } = await supabase
      .from("activity_profiles")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    setSubmitting(false);
    if (!profile) {
      setUserId(data.user.id);
      setStep("display-name");
      return;
    }
    onClose();
  }

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

        {step === "email" && (
          <form onSubmit={handleSendCode} className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--gray-600)]">{T.emailLabel[lang]}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={T.emailPlaceholder[lang]}
                autoFocus
                className={`${INPUT_CLASS} mt-1`}
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-black text-white text-sm font-semibold py-2.5 disabled:opacity-40 transition-opacity"
            >
              {submitting ? T.sending[lang] : T.sendCode[lang]}
            </button>
            <p className="text-xs text-[var(--gray-500)]">{T.sameAccount[lang]}</p>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <p className="text-sm text-[var(--gray-600)]">
              {T.codeSentTo[lang]} <span className="font-semibold text-black">{email}</span>
            </p>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--gray-600)]">{T.codeLabel[lang]}</span>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={T.codePlaceholder[lang]}
                autoFocus
                className={`${INPUT_CLASS} mt-1 tracking-widest text-center`}
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full rounded-full bg-black text-white text-sm font-semibold py-2.5 disabled:opacity-40 transition-opacity"
            >
              {submitting ? T.verifying[lang] : T.verify[lang]}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-xs text-[var(--gray-500)] hover:text-black transition-colors"
            >
              {T.useAnotherEmail[lang]}
            </button>
          </form>
        )}

        {step === "display-name" && userId && (
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
