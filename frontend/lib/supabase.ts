// 🔒 BACKEND/DB — DO NOT MODIFY (flagged for future work)
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Browser-safe client (anon key, respects RLS) ───────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

export const hasSupabaseKeys = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// ─── Server-only admin client (service role key, bypasses RLS) ──────────────
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key";

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
