"use client";

import { supabase } from "@/lib/supabaseClient";

export default function SignOutButton() {
  return (
    <button
      onClick={async () => { await supabase.auth.signOut(); }}
      className="text-sm underline"
    >
      Sign out
    </button>
  );
}
