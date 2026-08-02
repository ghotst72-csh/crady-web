import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie-backed server client for a future SSR-personalized read (e.g. "did
 * I already vote"). Not load-bearing for Phase 1 — no Server Component reads
 * through this yet; every public Activity read stays on the existing
 * anon-only `lib/supabase.ts` client. Scaffolding only. */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component (no response to attach cookies
          // to) — proxy.ts's session refresh is what keeps the session
          // fresh across requests in that case, so this is safe to ignore.
        }
      },
    },
  });
}
