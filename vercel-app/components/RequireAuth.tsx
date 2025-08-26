"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    // Listen for auth state changes so users are redirected after signing out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) router.replace("/");
    });

    // Initial check when component mounts
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) router.replace("/");
      else setChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!checked) return null; // could render a loader
  return <>{children}</>;
}
