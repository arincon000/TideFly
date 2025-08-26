"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.replace("/");
      }}
      className="text-sm underline"
    >
      Sign out
    </button>
  );
}
