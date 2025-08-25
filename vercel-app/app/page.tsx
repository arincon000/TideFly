"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Home() {
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
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">TideFly</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Primary: email + password. Users can switch to "Sign in" in the UI */}
          <Auth
            supabaseClient={supabase}
            view="sign_up"
            appearance={{ theme: ThemeSupa }}
            theme="dark"
            providers={[]}
            redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL || "https://tide-fly.vercel.app"}/reset`}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Already have an account? Use the “Sign in” link in the form.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
