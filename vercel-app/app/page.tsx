"use client";

import { useEffect, useState } from "react";
import { supabase } from "~/lib/supabase-browser";
import { Auth } from "@supabase/auth-ui-react";

export default function Home() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub?.subscription.unsubscribe();
  }, []);

  if (!email) {
    return (
      <>
        <h2>Sign in</h2>
        <p style={{ opacity: 0.8 }}>Use magic link (email) to sign in.</p>
        <Auth supabaseClient={supabase} view="magic_link" providers={[]} />
      </>
    );
  }

  return (
    <>
      <p>Signed in as <strong>{email}</strong></p>
      <p><a href="/alerts">Go to Alerts →</a></p>
    </>
  );
}
