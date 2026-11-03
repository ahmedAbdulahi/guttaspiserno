import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY mangler – se frontend/.env.example"
  );
}

/**
 * Anon-nøkkelen er ment å ligge i frontenden. Det er RLS og passordsjekken i
 * supabase/003_passord_og_rls.sql som bestemmer hvem som får skrive.
 */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
