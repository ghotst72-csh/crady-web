import { createClient } from "@supabase/supabase-js";

// Public (anon) client only — this project must never import the
// service_role key. Reference data tables are protected by RLS
// (SELECT-only for anon/authenticated; see CRADY main repo
// supabase/migrations/20260728_public_reference_tables_rls.sql).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
