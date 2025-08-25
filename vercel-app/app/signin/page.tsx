"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "SIGNED_IN") router.replace("/alerts");
    });
    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
    </main>
  );
}
