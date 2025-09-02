import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single client for client-side usage
export const supabase = createClient(url, anon);

// Use this ONLY for querying views in the "api" schema (e.g., api.v_tier_me)
export const api = () => supabase.schema('api');
