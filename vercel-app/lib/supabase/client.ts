import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side only client - uses public env vars
export const supabase = createClient(url, anon);

// Expose for console debugging in development
if (typeof window !== "undefined") {
  (window as any).sb = supabase;
}

// Use this ONLY for querying views in the "api" schema (e.g., api.v_tier_me)
export const api = () => supabase.schema('api');
