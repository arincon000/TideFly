"use client";

import { useState, ReactNode } from "react";

function FeatureCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-sky-100 grid place-items-center transition-transform duration-200 group-hover:scale-105">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600">{children}</p>
    </div>
  );
}

function BillingToggle({ value, onChange }: { value: "monthly" | "yearly"; onChange: (v: "monthly" | "yearly") => void }) {
  return (
    <div className="mx-auto inline-flex rounded-full border border-slate-200 p-1">
      {(["monthly", "yearly"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 text-sm font-semibold rounded-full transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
            value === v ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {v[0].toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div>
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-slate-900">TideFly</div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Pricing
            </a>
            <a
              href="#how-it-works"
              className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/auth?view=sign_in"
              className="text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Sign in
            </a>
            <a
              href="/auth?view=sign_up"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Start tracking waves
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
            <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
              Smart surf alerts for passionate surfers
            </span>
            <h1 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight">
              Never miss the perfect{' '}
              <span className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">wave</span>{' '}
              again
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Get intelligent surf alerts based on wave height, wind conditions, and your travel preferences. Tidefly monitors global swell conditions so you know when epic sessions await.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <a
                href="/auth?view=sign_up"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Start tracking waves
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-xl border border-blue-300 px-5 py-3 text-blue-700 hover:bg-blue-50 font-semibold transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                Watch demo
              </a>
            </div>

            <div className="mx-auto mt-12 aspect-video w-full max-w-4xl rounded-2xl bg-gradient-to-br from-sky-100 to-sky-200 shadow-inner grid place-items-center">
              <div className="h-14 w-14 rounded-full bg-white/90 shadow flex items-center justify-center">
                <span className="triangle-right ml-0.5 inline-block border-l-[12px] border-l-blue-600 border-y-[8px] border-y-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold">Stay ahead of the swell</h2>
              <p className="mt-3 text-lg text-slate-600">
                Intelligent swell alerts, travel-friendly recommendations and more to keep you on top of the waves.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              <FeatureCard icon={<span>🌊</span>} title="Real-time alerts">
                Get notified the moment your favorite spots start firing.
              </FeatureCard>
              <FeatureCard icon={<span>📍</span>} title="Travel friendly">
                Filter alerts by distance so you can chase swell on the go.
              </FeatureCard>
              <FeatureCard icon={<span>⚡</span>} title="Fast setup">
                Create your profile and start receiving alerts in minutes.
              </FeatureCard>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-sky-50 py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">How it works</h2>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                { n: 1, t: "Set your spots", d: "Choose favorite breaks and travel preferences." },
                { n: 2, t: "We monitor conditions", d: "Our engine watches global swells 24/7." },
                { n: 3, t: "Catch perfect waves", d: "Get instant alerts when it's time to paddle out." },
              ].map((s) => (
                <div key={s.n}>
                  <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-blue-500 text-white grid place-items-center text-xl font-bold">
                    {s.n}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{s.t}</h3>
                  <p className="mt-2 text-slate-600">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Choose your wave hunting plan</h2>
            <p className="mt-3 text-lg text-slate-600">
              From casual beach days to professional surf trips, we’ve got the perfect plan.
            </p>
            <div className="mt-6">
              <BillingToggle value={billing} onChange={setBilling} />
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Beach Bum */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">Beach Bum</h3>
                <p className="mt-1 text-slate-600">Up to 2 alerts</p>
                <p className="mt-6 text-4xl font-extrabold text-slate-900">
                  {billing === "monthly" ? "$0/mo" : "$0/yr"}
                </p>
                <ul className="mt-6 space-y-2 text-slate-600 list-disc pl-5">
                  <li>Bullet point</li>
                  <li>Bullet point</li>
                  <li>Bullet point</li>
                </ul>
                <a
                  href="/auth?view=sign_up"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-900 hover:bg-slate-200 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                >
                  Choose plan
                </a>
              </div>

              {/* Surf Seeker (featured) */}
              <div className="relative rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-sky-50 to-sky-100 p-8 text-left shadow-md">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
                <h3 className="text-2xl font-bold text-slate-900">Surf Seeker</h3>
                <p className="mt-1 text-slate-600">Unlimited alerts</p>
                <p className="mt-6 text-4xl font-extrabold text-slate-900">
                  {billing === "monthly" ? "$19/mo" : "$190/yr"}
                </p>
                <ul className="mt-6 space-y-2 text-slate-700 list-disc pl-5">
                  <li>Bullet point</li>
                  <li>Bullet point</li>
                  <li>Bullet point</li>
                </ul>
                <a
                  href="/auth?view=sign_up"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                >
                  Choose plan
                </a>
              </div>

              {/* Pro Rider */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">Pro Rider</h3>
                <p className="mt-1 text-slate-600">Advanced analytics</p>
                <p className="mt-6 text-4xl font-extrabold text-slate-900">
                  {billing === "monthly" ? "$39/mo" : "$390/yr"}
                </p>
                <ul className="mt-6 space-y-2 text-slate-600 list-disc pl-5">
                  <li>Bullet point</li>
                  <li>Bullet point</li>
                  <li>Bullet point</li>
                </ul>
                <a
                  href="/auth?view=sign_up"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-900 hover:bg-slate-200 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                >
                  Choose plan
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

