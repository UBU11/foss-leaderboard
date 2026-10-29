import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Extract project reference ID (e.g. yylasqpiysdtvzboscop)
export const supabaseProjectRef = supabaseUrl
  ? supabaseUrl.replace(/^https?:\/\//, "").split(".")[0]
  : "";

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Running in fallback offline mode."
  );
}

// Client instance for client-side and server-side operations
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;
