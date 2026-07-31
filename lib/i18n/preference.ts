// Stores ONLY an explicit user choice — never anything inferred from
// browser language alone (Part 6: "Never infer future preference"). All
// access is wrapped in try/catch: some private-browsing modes throw on
// localStorage access entirely, and this feature degrading to "no stored
// preference" is correct behavior there, not a crash.

const PREFERENCE_KEY = "crady_preferred_language";
const PROMPT_SEEN_KEY = "crady_lang_prompt_seen";

export type Lang = "en" | "ko";

export function getStoredLanguagePreference(): Lang | null {
  try {
    const v = window.localStorage.getItem(PREFERENCE_KEY);
    return v === "en" || v === "ko" ? v : null;
  } catch {
    return null;
  }
}

/** Only ever called from an explicit click (switcher, footer link, or the
 * recommendation card's two buttons) — never from a passive detection
 * signal like navigator.language. */
export function setStoredLanguagePreference(lang: Lang): void {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, lang);
  } catch {
    // Storage unavailable (e.g. some private-browsing modes) — the
    // in-progress navigation still proceeds via the caller; the
    // preference just won't persist for a future visit.
  }
}

export function hasSeenLanguagePrompt(): boolean {
  try {
    return window.localStorage.getItem(PROMPT_SEEN_KEY) === "1";
  } catch {
    return true; // fail closed — don't show a prompt we can't suppress next time
  }
}

export function markLanguagePromptSeen(): void {
  try {
    window.localStorage.setItem(PROMPT_SEEN_KEY, "1");
  } catch {
    // Same rationale as setStoredLanguagePreference above.
  }
}
