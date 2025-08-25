import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export function createClient() {
  const cookieStore = cookies();
  return createServerComponentClient({ cookies: () => cookieStore });
}
