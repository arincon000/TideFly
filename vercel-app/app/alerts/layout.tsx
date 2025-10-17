"use client";

import RequireAuth from "@/components/RequireAuth";
import SignOutButton from "@/components/SignOutButton";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useTier } from "@/lib/tier/useTier";

export default function AlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showPlanChooser, setShowPlanChooser] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<'monthly' | 'yearly'>('monthly');
  const { tier } = useTier();

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
      if (!res.ok) {
        console.error('Billing portal error:', data?.error || data);
        alert(`Unable to open billing portal. ${data?.error ? `(${data.error})` : ''}`);
        return;
      }
      if (data?.url) window.location.href = data.url as string;
    } finally {
      setBillingLoading(false);
    }
  };

  const startCheckoutByPlan = async (plan: 'monthly' | 'yearly') => {
    try {
      setCheckoutLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan === 'monthly' ? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY : process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY,
          userId: user?.id,
          email: user?.email,
        })
      });
      const data = await res.json();
      if (data?.url) window.location.href = data.url as string;
    } finally {
      setCheckoutLoading(false);
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
              {(!tier || (tier !== 'pro' && tier !== 'unlimited')) && (
                <button
                  onClick={() => setShowPlanChooser(true)}
                  className="text-sm sm:text-base rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-1.5 text-white font-semibold hover:from-sky-700 hover:to-blue-700 transition-colors disabled:opacity-60"
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Starting…' : 'Upgrade'}
                </button>
              )}
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

        {/* Plan chooser modal */}
        {showPlanChooser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPlanChooser(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Choose your plan</h3>
              <div className="inline-flex rounded-full border border-slate-200 p-1 bg-white mb-4">
                <button onClick={() => setUpgradePlan('monthly')} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${upgradePlan==='monthly' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>Monthly</button>
                <button onClick={() => setUpgradePlan('yearly')} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${upgradePlan==='yearly' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>Yearly</button>
              </div>
              <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-50 to-blue-50 p-5">
                <div className="text-2xl font-bold text-slate-900">Pro</div>
                <p className="mt-1 text-slate-700">For serious wave hunters</p>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold text-slate-900">{upgradePlan==='monthly' ? '$19' : '$13'}</span>
                  <span className="text-slate-700">/month</span>
                  {upgradePlan==='yearly' && <span className="ml-2 text-sm text-green-600 font-semibold">Save 32%</span>}
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-y-1 text-slate-700 text-sm">
                  <li>✓ 5 active alerts</li>
                  <li>✓ Up to 10 total alerts</li>
                  <li>✓ Custom surf conditions</li>
                  <li>✓ Max price threshold</li>
                  <li>✓ 10-day forecast window</li>
                  <li>✓ Advanced planning logic</li>
                </ul>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button className="px-4 py-2 text-slate-600 hover:text-slate-900" onClick={() => setShowPlanChooser(false)}>Cancel</button>
                <button className="rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-60" disabled={checkoutLoading} onClick={() => startCheckoutByPlan(upgradePlan)}>
                  {checkoutLoading ? 'Starting…' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
