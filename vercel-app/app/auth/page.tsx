"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const router = useRouter();

  // If already signed in, go straight to /alerts
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/alerts");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) router.replace("/alerts");
      if (event === "SIGNED_OUT") router.replace("/");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4">TideFly</h1>
        {/* Primary: email + password. Users can switch to "Sign in" in the UI */}
        <Auth
          supabaseClient={supabase}
          view="sign_up"
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={[]} // add Google/GitHub later
          redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL || "https://tide-fly.vercel.app"}/reset`}
        />
        <p className="text-sm text-zinc-400 mt-3">
          Already have an account? Use the “Sign in” link in the form.
        </p>
      </div>
    </main>
  );
}
