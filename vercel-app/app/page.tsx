"use client";
import "./globals.css"; // leave for THIS redeploy
import { useState } from "react";

export default function LandingPage() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Demo wizard state (hero section)
  type Skill = 'beginner' | 'intermediate' | 'advanced';
  const demoSpots: { id: string; name: string; country: string; dest: string }[] = [
    { id: 'ericeira', name: 'Ericeira', country: 'Portugal', dest: 'LIS' },
    { id: 'hossegor', name: 'Hossegor', country: 'France', dest: 'BIQ' },
    { id: 'bali', name: 'Uluwatu', country: 'Indonesia', dest: 'DPS' },
    { id: 'canary', name: 'Las Palmas', country: 'Canary Islands', dest: 'LPA' },
    { id: 'barbados', name: 'Batts Rock', country: 'Barbados', dest: 'BGI' },
    { id: 'taghazout', name: 'Taghazout', country: 'Morocco', dest: 'AGA' },
    { id: 'algarve', name: 'Algarve', country: 'Portugal', dest: 'FAO' },
    { id: 'hawaii', name: 'Oahu (North Shore)', country: 'USA', dest: 'HNL' },
    { id: 'santacruz', name: 'Santa Cruz', country: 'USA', dest: 'SFO' },
    { id: 'lanzarote', name: 'Lanzarote', country: 'Canary Islands', dest: 'ACE' },
  ];
  const [demoSkill, setDemoSkill] = useState<Skill | null>(null);
  const [demoSpot, setDemoSpot] = useState<string>('');
  const [demoOrigin, setDemoOrigin] = useState<string>('');
  const [demoBudget, setDemoBudget] = useState<string>('');
  const [demoOpen, setDemoOpen] = useState<boolean>(false);
  const [demoDone, setDemoDone] = useState<boolean>(false);

  const demoStep = !demoOpen ? 0 : (demoSkill ? (demoSpot ? (demoOrigin.length===3 ? 3 : 2) : 1) : 0);
  const demoProgress = (demoStep/3)*100;

  return (
    <div>
      <header className="bg-gradient-to-b from-white/80 to-sky-50/50 backdrop-blur border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-slate-900 hover:text-slate-700 transition-colors">
            TideFly 🌊
          </a>
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
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-2 text-white font-semibold hover:from-sky-700 hover:to-teal-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
            >
              Start tracking waves
            </a>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-white">
        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-teal-50 to-white pb-12 md:pb-14">
          {/* Decorative ocean glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"></div>
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
            <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
              Surf forecasting meets flight booking
            </span>

            <h1 className="mt-4 md:mt-6 text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
              Catch the perfect{" "}
              <span className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">wave</span>{" "}
              at the perfect price
            </h1>

            <p className="mx-auto mt-3 md:mt-4 max-w-2xl text-lg text-slate-600">
              We monitor surf conditions and flight prices 24/7, alerting you the moment your ideal waves align with budget-friendly flights.
            </p>

            {/* Reuse existing CTA links – if they already exist in the file, keep their href and just add these classes */}
            <div className="mt-6 md:mt-8 flex items-center justify-center gap-3 md:gap-4">
              <a href="/auth?view=sign_up" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-5 py-3 text-white font-semibold hover:from-sky-700 hover:to-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2">
                Start tracking waves
              </a>
              <a href="#features" className="inline-flex items-center justify-center rounded-xl border border-sky-300 px-5 py-3 text-sky-700 hover:bg-sky-50 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2">
                See features →
              </a>
            </div>

            {/* Trust bar */}
            <div className="mt-4 md:mt-6 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm md:text-base font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                <span aria-hidden>🌍</span>
                Monitoring 5800+ surf spots worldwide
              </span>
            </div>

            {/* Interactive demo wizard (mock) */}
            {/* Gradient frame wrapper for elevated look */}
            <div className="mx-auto mt-6 md:mt-8 w-full max-w-4xl bg-gradient-to-r from-sky-200/60 via-teal-200/60 to-sky-200/60 p-0.5 rounded-3xl shadow-xl">
            <div className="rounded-3xl bg-white p-5 md:p-6 border border-white/60">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-900">Build a surf alert</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">🔒 Nothing saved</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">⚡ 30‑second demo</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">✉️ Email alerts on real accounts</span>
                  </div>
                </div>
                <button
                  onClick={() => { setDemoOpen((v) => !v); setDemoDone(false); setDemoSkill(null); setDemoSpot(''); setDemoOrigin(''); setDemoBudget(''); }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >{demoOpen ? 'Reset demo' : 'Try it now →'}</button>
              </div>

              {demoOpen && (
                <div className="mb-5">
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-teal-500 transition-all duration-500 ease-out" style={{ width: `${demoProgress}%` }}></div>
                  </div>
                  {/* Step chips */}
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {['Skill','Spot','Trip'].map((label, idx) => (
                      <div key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border ${demoStep>idx ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <span className={`w-4 h-4 grid place-items-center rounded-full text-[10px] ${demoStep>idx ? 'bg-blue-600 text-white' : 'bg-slate-300 text-white'}`}>{idx+1}</span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!demoOpen ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-slate-600 text-sm md:text-base">Test‑drive the flow without creating an account. Choose a skill, pick a spot, and set your origin airport.</p>
                  <button onClick={() => setDemoOpen(true)} className="rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-5 py-3 text-white font-semibold hover:from-sky-700 hover:to-teal-700">Start demo</button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Step 1: Skill */}
                  <div>
                  <div className="mb-2 text-sm font-semibold text-slate-900">1. Choose your skill level</div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { key: 'beginner', label: '🌱 Beginner', desc: '0.8–1.5m, ≤25 km/h' },
                        { key: 'intermediate', label: '⚡ Intermediate', desc: '1.2–2.5m, ≤30 km/h' },
                        { key: 'advanced', label: '🔥 Advanced', desc: '2.0–4.0m, ≤35 km/h' },
                      ] as const).map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setDemoSkill(opt.key)}
                          className={`px-4 py-2 rounded-xl border text-left text-sm transition-all ${demoSkill===opt.key ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                          title={opt.desc}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Spot */}
                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-900">2. Choose your spot</div>
                    <select
                      value={demoSpot}
                      onChange={(e)=>setDemoSpot(e.target.value)}
                      disabled={!demoSkill}
                      className="w-full md:w-auto rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-sky-300"
                    >
                      <option value="">{demoSkill ? 'Select a spot' : 'Choose skill first'}</option>
                      {demoSpots.map(s => (
                        <option key={s.id} value={s.id}>{s.name} – {s.country}</option>
                      ))}
                    </select>
                  </div>

                  {/* Step 3: Trip basics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="mb-2 text-sm font-semibold text-slate-900">Origin (IATA)</div>
                      <input
                        value={demoOrigin}
                        onChange={(e)=>setDemoOrigin(e.target.value.toUpperCase().slice(0,3))}
                        placeholder="e.g., LAX"
                        className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-300"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold text-slate-900">Budget (optional)</div>
                      <input
                        type="number"
                        value={demoBudget}
                        onChange={(e)=>setDemoBudget(e.target.value)}
                        placeholder="e.g., 600"
                        className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-teal-300"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={()=> setDemoDone(true)}
                        disabled={!demoSkill || !demoSpot || demoOrigin.length!==3}
                        className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-3 text-white font-semibold hover:from-sky-700 hover:to-teal-700 disabled:opacity-50 shadow"
                      >Create demo alert</button>
                    </div>
                  </div>

                  {demoDone && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-start gap-2 animate-[fadeIn_0.3s_ease-out]">
                      <span>✅</span>
                      <div>
                        <div className="font-semibold">Demo alert created!</div>
                        <div>This is a preview of how TideFly works. Sign up to save real alerts and get email notifications.</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>
          {/* Wave separator */}
          <svg className="pointer-events-none absolute bottom-0 left-0 w-full -z-10" viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden>
            <path d="M0,64L48,58.7C96,53,192,43,288,42.7C384,43,480,53,576,58.7C672,64,768,64,864,64C960,64,1056,64,1152,64C1248,64,1344,64,1392,64L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" fill="#fff" fillOpacity="1"/>
          </svg>
        </section>

    {/* HOW IT WORKS (Expanded) */}
    <section id="how-it-works" className="py-20 md:py-24 bg-gradient-to-b from-white to-sky-50/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl md:text-4xl font-extrabold text-center text-slate-900">
          How TideFly works
        </h2>
        <p className="mt-2 md:mt-3 text-base md:text-lg text-slate-600 text-center max-w-3xl mx-auto">
          We match surf forecasts with flight prices — then tap you on the shoulder when a good session becomes bookable from your home airport.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="group relative rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-6 text-center shadow-sm hover:shadow-lg transition-shadow">
            <div className="absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gradient-to-r from-sky-400 to-teal-400"></div>
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 ring-1 ring-sky-200 grid place-items-center text-sky-700"><span className="text-xl">🏄‍♂️</span></div>
            <div className="font-semibold text-slate-900 mb-1">1) Choose your skill</div>
            <div className="text-sm text-slate-600">We set sensible wave/wind presets so you only see days you’d actually surf.</div>
          </div>
          <div className="group relative rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-6 text-center shadow-sm hover:shadow-lg transition-shadow">
            <div className="absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gradient-to-r from-sky-400 to-teal-400"></div>
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 ring-1 ring-sky-200 grid place-items-center text-sky-700"><span className="text-xl">📍</span></div>
            <div className="font-semibold text-slate-900 mb-1">2) Pick a spot</div>
            <div className="text-sm text-slate-600">Select a destination (or several). We know each spot’s local difficulty and seasonality.</div>
          </div>
          <div className="group relative rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-6 text-center shadow-sm hover:shadow-lg transition-shadow">
            <div className="absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gradient-to-r from-sky-400 to-teal-400"></div>
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 ring-1 ring-sky-200 grid place-items-center text-sky-700"><span className="text-xl">✈️</span></div>
            <div className="font-semibold text-slate-900 mb-1">3) Set trip basics</div>
            <div className="text-sm text-slate-600">Home airport, forecast window, optional price guardrails. Then you forget about it.</div>
          </div>
          <div className="group relative rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-6 text-center shadow-sm hover:shadow-lg transition-shadow">
            <div className="absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gradient-to-r from-sky-400 to-teal-400"></div>
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 ring-1 ring-sky-200 grid place-items-center text-sky-700"><span className="text-xl">🔔</span></div>
            <div className="font-semibold text-slate-900 mb-1">4) We monitor 24/7</div>
            <div className="text-sm text-slate-600">When waves match and flights are reasonable, we email you with book-now links.</div>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-slate-500">
          The interactive demo above is a simplified preview. The full wizard adds planning logic, longer forecast windows, and custom thresholds (Pro).
        </div>
      </div>
    </section>

    {/* WHY TIDEFLY (Value) */}
    <section className="py-14 md:py-18 bg-gradient-to-b from-sky-50/40 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 text-center">Why surfers use TideFly</h3>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="font-semibold text-slate-900 mb-1">Save hours every week</div>
            <div className="text-sm text-slate-600">Skip the tab‑sprawl. We check forecasts and prices for you — continuously.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="font-semibold text-slate-900 mb-1">Catch the good windows</div>
            <div className="text-sm text-slate-600">We focus on morning surfability and match the days that actually work.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="font-semibold text-slate-900 mb-1">Book with confidence</div>
            <div className="text-sm text-slate-600">Email alerts include flight and hotel links for the exact dates we found.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="font-semibold text-slate-900 mb-1">Budget guardrails</div>
            <div className="text-sm text-slate-600">Free highlights cheap or reasonable prices; Pro enforces your price cap.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="font-semibold text-slate-900 mb-1">Built for your level</div>
            <div className="text-sm text-slate-600">Beginner, Intermediate, Advanced presets — or fully custom with Pro.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="font-semibold text-slate-900 mb-1">Discover more, stress less</div>
            <div className="text-sm text-slate-600">Explore new regions with confidence knowing we screen for your conditions.</div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-16 md:py-20 bg-gradient-to-b from-white to-sky-50/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">

            <div className="mt-8 md:mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Card 1 */}
              <div className="group relative rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-8 text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg">
                <div className="absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gradient-to-r from-sky-400 to-teal-400"></div>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 ring-1 ring-sky-200 grid place-items-center transition-transform duration-200 group-hover:scale-105">
                  <span className="text-2xl" aria-hidden>🌊</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Smart Surf Alerts</h3>
                <p className="mt-2 text-slate-600">Get notified when waves, wind, and conditions match your skill level—no more guessing.</p>
              </div>

              {/* Card 2 */}
              <div className="group relative rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-8 text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg">
                <div className="absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gradient-to-r from-sky-400 to-teal-400"></div>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 ring-1 ring-sky-200 grid place-items-center transition-transform duration-200 group-hover:scale-105">
                  <span className="text-2xl" aria-hidden>✈️</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Flight Price Tracking</h3>
                <p className="mt-2 text-slate-600">We monitor flight prices 24/7, so you book when it's cheap, not when it's too late.</p>
              </div>

              {/* Card 3 */}
              <div className="group relative rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-8 text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg">
                <div className="absolute top-0 left-0 h-1 w-full rounded-t-2xl bg-gradient-to-r from-sky-400 to-teal-400"></div>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 ring-1 ring-sky-200 grid place-items-center transition-transform duration-200 group-hover:scale-105">
                  <span className="text-2xl" aria-hidden>🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Personalized Thresholds</h3>
                <p className="mt-2 text-slate-600">Set custom wave heights, wind limits, and price caps—your perfect session, your rules.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-16 md:py-20 bg-gradient-to-b from-white to-sky-50/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Choose your wave-hunting plan</h2>
            <p className="mt-3 text-lg text-slate-600">
              From casual beach days to professional surf trips, we've got the perfect plan.
            </p>

            {/* Toggle (UI only) */}
            <div className="mt-6 inline-flex rounded-full border border-slate-200 p-1 bg-white/70 backdrop-blur">
              <button
                onClick={() => setCycle('monthly')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full ${cycle === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle('yearly')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full ${cycle === 'yearly' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                Yearly
              </button>
            </div>

            <div className="mt-10 md:mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 text-left">
              {/* Free Tier */}
              <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-8 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-900">Free</h3>
                <p className="mt-1 text-slate-600">Perfect to get started</p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-slate-900">$0</span>
                  <span className="text-slate-600">/month</span>
                </div>
                <ul className="mt-6 space-y-3 text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>1 active alert</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Up to 3 total alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Preset surf conditions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>5-day forecast window</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>Email notifications</span>
                  </li>
                </ul>
                <a href="/auth?view=sign_up" className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-900 hover:bg-slate-200 transition-colors duration-200">
                  Get Started
                </a>
              </div>

              {/* Pro Tier (featured) */}
              <div className="relative rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-50 to-teal-50 p-8 shadow-md">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
                <h3 className="text-2xl font-bold text-slate-900">Pro</h3>
                <p className="mt-1 text-slate-700">For serious wave hunters</p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-slate-900">{cycle === 'monthly' ? '$19' : '$15'}</span>
                  <span className="text-slate-700">/month</span>
                  {cycle === 'yearly' && <span className="ml-2 text-sm text-green-600 font-semibold">Save 20%</span>}
                </div>
                <ul className="mt-6 space-y-3 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="font-semibold">5 active alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="font-semibold">Up to 10 total alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="font-semibold">Custom surf conditions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="font-semibold">Max price threshold</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="font-semibold">10-day forecast window</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="font-semibold">Advanced planning logic</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="font-semibold">Priority email alerts</span>
                  </li>
                </ul>
                <a href="/auth?view=sign_up" className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-5 py-3 font-semibold text-white hover:from-sky-700 hover:to-teal-700 transition-colors duration-200">
                  Upgrade to Pro
                </a>
              </div>

              {/* Pro+ Tier (Coming Soon) */}
              <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-purple-50 via-sky-50 to-pink-50 p-8 shadow-sm relative overflow-hidden flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
                <div className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-2xl">✨</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Pro+</h3>
                  <p className="text-slate-600 mb-6 max-w-xs mx-auto">For the ultimate wave chaser</p>
                  <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg">
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

