"use client";
import "./globals.css"; // leave for THIS redeploy
import { useState } from "react";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import { supabase } from "@/lib/supabaseClient";

export default function LandingPage() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);

  // Demo wizard state (hero section)
  type Skill = 'beginner' | 'intermediate' | 'advanced';
  const demoSpots: { id: string; name: string; country: string; dest: string; region: 'Europe'|'North America'|'Central America'|'South America'|'Caribbean'|'Africa'|'Asia-Pacific' }[] = [
    { id: 'ericeira', name: 'Ericeira', country: 'Portugal', dest: 'LIS', region: 'Europe' },
    { id: 'hossegor', name: 'Hossegor', country: 'France', dest: 'BIQ', region: 'Europe' },
    { id: 'bali', name: 'Uluwatu', country: 'Indonesia', dest: 'DPS', region: 'Asia-Pacific' },
    { id: 'canary', name: 'Las Palmas', country: 'Canary Islands', dest: 'LPA', region: 'Europe' },
    { id: 'barbados', name: 'Batts Rock', country: 'Barbados', dest: 'BGI', region: 'Caribbean' },
    { id: 'taghazout', name: 'Taghazout', country: 'Morocco', dest: 'AGA', region: 'Africa' },
    { id: 'algarve', name: 'Algarve', country: 'Portugal', dest: 'FAO', region: 'Europe' },
    { id: 'hawaii', name: 'Oahu (North Shore)', country: 'USA', dest: 'HNL', region: 'North America' },
    { id: 'santacruz', name: 'Santa Cruz', country: 'USA', dest: 'SFO', region: 'North America' },
    { id: 'lanzarote', name: 'Lanzarote', country: 'Canary Islands', dest: 'ACE', region: 'Europe' },
    { id: 'tamarindo', name: 'Tamarindo', country: 'Costa Rica', dest: 'LIR', region: 'Central America' },
  ];
  const [demoSkill, setDemoSkill] = useState<Skill | null>(null);
  const [demoRegion, setDemoRegion] = useState<string>('');
  const [demoCountry, setDemoCountry] = useState<string>('');
  const [demoSpot, setDemoSpot] = useState<string>('');
  const [demoOrigin, setDemoOrigin] = useState<string>('');
  const [demoOriginRaw, setDemoOriginRaw] = useState<string>('');
  const [demoBudget, setDemoBudget] = useState<string>('');
  const [demoOpen, setDemoOpen] = useState<boolean>(false);
  const [demoDone, setDemoDone] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0); // 0..5
  const TOTAL_STEPS = 6;
  const demoProgress = (demoStep/(TOTAL_STEPS-1))*100;

  // Custom conditions (demo)
  const [demoWaveMin, setDemoWaveMin] = useState<number>(1.2);
  const [demoWaveMax, setDemoWaveMax] = useState<number>(2.5);
  const [demoWindMax, setDemoWindMax] = useState<number>(25);
  const [demoPrice, setDemoPrice] = useState<string>("");
  const [demoPlanning, setDemoPlanning] = useState<'conservative'|'aggressive'|'optimistic'>('conservative');

  const isIata = (v: string) => /^[A-Z]{3}$/.test(v);

  const startCheckout = async (priceId?: string) => {
    try {
      setCheckoutLoading(true);
      // Use explicit priceId if provided, otherwise choose by current toggle
      const chosen = priceId || (cycle === 'monthly' ? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY : process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY);
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: chosen, userId: user?.id, email: user?.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Checkout error');
      if (data?.url) window.location.href = data.url as string;
    } catch (err) {
      console.error('checkout error', err);
      alert('Unable to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div>
      <header className="bg-gradient-to-b from-white/80 to-sky-50/50 backdrop-blur border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity">
            <span className="text-xl sm:text-2xl" aria-hidden>🌊</span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900">TideFly</span>
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
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/auth?view=sign_in"
              className="text-sm sm:text-base text-slate-700 hover:text-slate-900 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              Sign in
            </a>
            <a
              href="/auth?view=sign_up"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base text-white font-semibold hover:from-sky-700 hover:to-blue-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 whitespace-nowrap"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      <main className="min-h-screen" style={{ background: "linear-gradient(180deg, rgba(186,230,253,0.9) 0%, rgba(191,219,254,0.75) 28%, rgba(240,249,255,0.55) 62%, #ffffff 100%)" }}>
        {/* HERO */}
        <section className="relative overflow-hidden pb-8 md:pb-10">
          {/* Decorative ocean glows */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl"></div>
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
            <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
              Surf forecasting meets flight booking
            </span>

            <h1 className="mt-4 md:mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
              Catch the perfect{" "}
              <span className="bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">wave</span>{" "}
              at the perfect price
            </h1>

            <p className="mx-auto mt-3 md:mt-4 max-w-2xl text-lg text-slate-600">
              We monitor surf conditions and flight prices 24/7, alerting you the moment your ideal waves align with budget-friendly flights.
            </p>

            {/* Reuse existing CTA links – if they already exist in the file, keep their href and just add these classes */}
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <a href="/auth?view=sign_up" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-3 text-white font-semibold hover:from-sky-700 hover:to-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2">
                Start tracking waves
              </a>
              <a href="#features" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-sky-300 bg-white px-5 py-3 text-sky-700 hover:bg-sky-50 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2">
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
            <div className="mx-auto mt-6 md:mt-8 w-full max-w-4xl bg-gradient-to-r from-sky-200/60 via-blue-200/60 to-sky-200/60 p-0.5 rounded-3xl shadow-xl">
            <div className="rounded-3xl bg-white p-5 md:p-6 border border-white/60">
              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 items-center">
                <div className="hidden md:block" />
                <div className="text-center">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900">Build a surf alert</h3>
                  <div className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">🔒 Nothing saved</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">⚡ 30‑second demo</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">✉️ Email alerts on real accounts</span>
                  </div>
                </div>
                <div className="mt-3 md:mt-0 flex justify-center md:justify-end">
                  <button
                    onClick={() => { setDemoOpen((v) => !v); setDemoDone(false); setDemoSkill(null); setDemoSpot(''); setDemoOrigin(''); setDemoBudget(''); }}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >{demoOpen ? 'Reset demo' : 'Try it now →'}</button>
                </div>
              </div>

              {demoOpen && (
                <div className="mb-5">
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 transition-all duration-500 ease-out" style={{ width: `${demoProgress}%` }}></div>
                  </div>
                  {/* Step chips */}
                  <div className="mt-2 flex items-center justify-center flex-wrap gap-3 text-xs">
                    {['Skill','Location','Spot','Forecast','Trip','Conditions'].map((label, idx) => (
                      <div key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border ${demoStep>=idx ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <span className={`w-4 h-4 grid place-items-center rounded-full text-[10px] ${demoStep>=idx ? 'bg-blue-600 text-white' : 'bg-slate-300 text-white'}`}>{idx+1}</span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!demoOpen ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-slate-600 text-sm md:text-base">Test‑drive the real flow step‑by‑step without creating an account.</p>
                  <button onClick={() => { setDemoOpen(true); setDemoStep(0); }} className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-3 text-white font-semibold hover:from-sky-700 hover:to-blue-700">Start demo</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Step content - slideshow style */}
                  {demoStep === 0 && (
                    <div className="max-w-2xl mx-auto">
                      <div className="mb-2 text-sm font-semibold text-slate-900">1. Choose your skill level</div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {([
                          { key: 'beginner', label: '🌱 Beginner' },
                          { key: 'intermediate', label: '⚡ Intermediate' },
                          { key: 'advanced', label: '🔥 Advanced' },
                        ] as const).map(opt => (
                          <button key={opt.key} onClick={() => { setDemoSkill(opt.key); setDemoStep(1); }} className={`px-4 py-2 rounded-xl border text-left text-sm transition-all ${demoSkill===opt.key ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {demoStep === 1 && (
                    <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="mb-2 text-sm font-semibold text-slate-900">2. Region</div>
                        <select value={demoRegion} onChange={e=>{ setDemoRegion(e.target.value); setDemoCountry(''); setDemoSpot(''); }} className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-300">
                          <option value="">Select region</option>
                          {['Europe','North America','Central America','Caribbean','Africa','Asia-Pacific'].map(r=> <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-semibold text-slate-900">Country</div>
                        <select value={demoCountry} onChange={e=>{ setDemoCountry(e.target.value); setDemoSpot(''); }} className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-300" disabled={!demoRegion}>
                          <option value="">{demoRegion ? 'Select country' : 'Select region first'}</option>
                          {Array.from(new Set(demoSpots.filter(s=> !demoRegion || s.region===demoRegion).map(s=>s.country))).map(c=> <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1 md:col-span-2 flex justify-end">
                        <button onClick={()=> setDemoStep(2)} disabled={!demoRegion} className="rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold disabled:opacity-50">Next</button>
                      </div>
                    </div>
                  )}
                  {demoStep === 2 && (
                    <div className="max-w-2xl mx-auto">
                      <div className="mb-2 text-sm font-semibold text-slate-900">3. Choose your surf spot</div>
                      <select value={demoSpot} onChange={(e)=>setDemoSpot(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-300">
                        <option value="">Select a spot</option>
                        {demoSpots.filter(s => (!demoRegion || s.region===demoRegion) && (!demoCountry || s.country===demoCountry)).map(s => (
                          <option key={s.id} value={s.id}>{s.name} – {s.country}</option>
                        ))}
                      </select>
                      <div className="mt-3 flex justify-between">
                        <button onClick={()=> setDemoStep(1)} className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700">Back</button>
                        <button onClick={()=> setDemoStep(3)} disabled={!demoSpot} className="rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold disabled:opacity-50">Next</button>
                      </div>
                    </div>
                  )}
                  {demoStep === 3 && (
                    <div className="max-w-2xl mx-auto">
                      <div className="mb-2 text-sm font-semibold text-slate-900">4. Forecast window</div>
                      <div className="inline-flex rounded-full border border-slate-200 p-1">
                        {['5','10','16'].map(v => (
                          <button key={v} type="button" onClick={()=> setDemoStep(4)} className="px-4 py-2 text-sm font-semibold rounded-full text-slate-700 hover:bg-slate-100">{v} days</button>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-between">
                        <button onClick={()=> setDemoStep(2)} className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700">Back</button>
                      </div>
                    </div>
                  )}
                  {demoStep === 4 && (
                    <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <div className="mb-2 text-sm font-semibold text-slate-900">Origin (IATA)</div>
                        {/* Simplified demo: static dropdown to ensure reliability without Supabase */}
                        <select
                          value={demoOrigin}
                          onChange={(e)=>setDemoOrigin(e.target.value.toUpperCase())}
                          className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-300"
                        >
                          <option value="">Select an airport (demo)</option>
                          {[
                            { iata: 'LAX', label: 'LAX — Los Angeles, US' },
                            { iata: 'MAD', label: 'MAD — Madrid, ES' },
                            { iata: 'LIS', label: 'LIS — Lisbon, PT' },
                            { iata: 'BRU', label: 'BRU — Brussels, BE' },
                            { iata: 'JFK', label: 'JFK — New York (JFK), US' },
                            { iata: 'SFO', label: 'SFO — San Francisco, US' },
                            { iata: 'CDG', label: 'CDG — Paris (CDG), FR' },
                            { iata: 'LHR', label: 'LHR — London (Heathrow), GB' },
                          ].map(a => (
                            <option key={a.iata} value={a.iata}>{a.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="mb-2 text-sm font-semibold text-slate-900">Max Flight Price ($)</div>
                        <input type="number" value={demoBudget} onChange={(e)=>setDemoBudget(e.target.value)} placeholder="" className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:ring-2 focus:ring-sky-300" />
                      </div>
                      <div className="col-span-1 md:col-span-3 mt-3 flex items-center justify-between gap-3">
                        <button onClick={()=> setDemoStep(3)} className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700">Back</button>
                        <div className="text-xs text-slate-500">Max Flight Price ($)</div>
                        <button onClick={()=> setDemoStep(5)} disabled={!isIata(demoOrigin)} className="rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold disabled:opacity-50">Next</button>
                      </div>
                    </div>
                  )}
                  {demoStep === 5 && (
                    <div className="max-w-2xl mx-auto space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="mb-2 text-sm font-semibold text-slate-900">Wave min/max (m)</div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="number" step="0.1" value={demoWaveMin} onChange={e=>setDemoWaveMin(parseFloat(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300" />
                            <input type="number" step="0.1" value={demoWaveMax} onChange={e=>setDemoWaveMax(parseFloat(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300" />
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-sm font-semibold text-slate-900">Wind max (km/h)</div>
                          <input type="number" value={demoWindMax} onChange={e=>setDemoWindMax(parseFloat(e.target.value))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-300" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="mb-2 text-sm font-semibold text-slate-900">Planning logic</div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {(['conservative','aggressive','optimistic'] as const).map(k => (
                            <label key={k} className={`cursor-pointer px-3 py-2 rounded-lg border-2 text-sm ${demoPlanning===k ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                              <input type="radio" className="mr-2" checked={demoPlanning===k} onChange={()=>setDemoPlanning(k)} />
                              {k}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <button onClick={()=> setDemoStep(4)} className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700">Back</button>
                        <button onClick={()=> setDemoDone(true)} disabled={!demoSkill || !demoSpot || !isIata(demoOrigin)} className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2 text-white font-semibold disabled:opacity-50">Create demo alert</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">Demo note: This builder uses a small sample of airports and spots to illustrate the flow.</p>
                        <a href="/auth?view=sign_up" className="rounded-lg bg-blue-600 px-3 py-2 text-white text-sm font-semibold hover:bg-blue-700">Sign up</a>
                      </div>
                    </div>
                  )}

                  {demoDone && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-2 animate-[fadeIn_0.3s_ease-out]">
                      <span>✅</span>
                      <div>
                        <div className="font-semibold">Demo alert created!</div>
                        <div>This is a preview of the real wizard. Sign up to save your alert and get email notifications.</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
          {/* Seamless background handled by page-level gradient; wave separator removed for continuous flow */}
        </section>

        {/* VALUE SECTION (Consolidated) */}
        <section id="features" className="py-14 md:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Why TideFly works (and saves you time)</h2>
            <p className="mt-3 text-base md:text-lg text-slate-600 max-w-3xl mx-auto">
              We match surf forecasts with flight prices and alert you when a trip is actually worth booking from your home airport.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-5 text-left">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-2 text-xl">🏄‍♂️</div>
                <div className="font-semibold text-slate-900">Built for your level</div>
                <div className="text-sm text-slate-600">Beginner, Intermediate, Advanced presets so you only see surfable days.</div>
                </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-2 text-xl">📍</div>
                <div className="font-semibold text-slate-900">Pick a spot, we do the rest</div>
                <div className="text-sm text-slate-600">We factor local difficulty and morning surfability.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-2 text-xl">✈️</div>
                <div className="font-semibold text-slate-900">Fair flight prices</div>
                <div className="text-sm text-slate-600">Free highlights reasonable prices; Pro enforces a price cap.</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-2 text-xl">🔔</div>
                <div className="font-semibold text-slate-900">We monitor 24/7</div>
                <div className="text-sm text-slate-600">You’ll get an email with book‑now links the moment things line up.</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="/auth?view=sign_up" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-3 text-white font-semibold hover:from-sky-700 hover:to-blue-700">Create a free alert</a>
              <a href="/auth?view=sign_up" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-sky-300 bg-white px-6 py-3 text-sky-700 font-semibold hover:bg-sky-50">Upgrade to Pro</a>
            </div>

            <p className="mt-3 text-xs text-slate-500">The wizard in the hero is a preview. The full builder adds longer windows and custom thresholds (Pro).</p>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Choose your wave-hunting plan</h2>
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
              <div className="relative rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-50 to-blue-50 p-8 shadow-md">
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
                <button onClick={() => startCheckout(cycle === 'monthly' ? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY : process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY)} className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-3 font-semibold text-white hover:from-sky-700 hover:to-blue-700 transition-colors duration-200 disabled:opacity-60" disabled={checkoutLoading}>
                  {checkoutLoading ? 'Starting checkout...' : 'Upgrade to Pro'}
                </button>
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

