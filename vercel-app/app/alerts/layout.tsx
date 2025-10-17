"use client";

import RequireAuth from "@/components/RequireAuth";
import SignOutButton from "@/components/SignOutButton";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function AlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled) setCustomerId(data?.stripe_customer_id || null);
      } catch {}
    })();
    return () => { cancelled = true }; 
  }, []);

  const openBillingPortal = async () => {
    if (!customerId) return;
    try {
      setBillingLoading(true);
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId })
      });
      const data = await res.json();
      if (data?.url) window.location.href = data.url as string;
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 rounded">
              <span className="text-xl sm:text-2xl" aria-hidden>🌊</span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">TideFly</div>
            </a>
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="/alerts"
                className="text-sm sm:text-base text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Dashboard
              </a>
              {customerId && (
                <button
                  onClick={openBillingPortal}
                  className="text-sm sm:text-base rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-60"
                  disabled={billingLoading}
                >
                  {billingLoading ? 'Opening billing…' : 'Manage billing'}
                </button>
              )}
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
