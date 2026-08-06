"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { logAuthEvent } from "@/lib/auth/authLog";
import { AuthModal } from "./AuthModal";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  /** Every posting/voting island calls this instead of writing directly
   * when signed out — RLS backs this up server-side regardless. */
  openAuthModal: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Mounted once in the root layout (both EN and KO trees) so any island
 * anywhere on the page — vote button, composer, comment actions — can read
 * sign-in state and trigger the shared modal without prop-drilling through
 * server components.
 *
 * `lang` is which tree mounted this provider (app/(en)/layout.tsx passes
 * "en", app/ko/layout.tsx passes "ko") — fixed for the whole page load, so
 * it's read once here rather than threaded through every `openAuthModal()`
 * call site. Previously not accepted at all, which meant the modal always
 * rendered in English even when triggered from the Korean tree. */
export function AuthProvider({ children, lang = "en" }: { children: React.ReactNode; lang?: "en" | "ko" }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      logAuthEvent({ call: "getSession", phase: "init", authEvent: data.session ? "restored" : "none" });
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      logAuthEvent({ call: "onAuthStateChange", phase: "listener", authEvent: event });
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ session, loading, openAuthModal: () => setModalOpen(true) }}
    >
      {children}
      {modalOpen && <AuthModal lang={lang} onClose={() => setModalOpen(false)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
