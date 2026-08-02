import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cookie-backed browser client — the one every auth/activity write goes
 * through. Distinct from the read-only `lib/supabase.ts` client (server-side,
 * `persistSession: false`), which stays untouched and keeps serving every
 * existing public read on the site. */
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
