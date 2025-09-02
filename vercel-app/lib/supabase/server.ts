import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

// Server-side only client - uses service key env vars
export const supabase = createClient(url, serviceKey);
