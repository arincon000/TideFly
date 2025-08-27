"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { WEEKENDS } from "@/lib/days";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import { getUserPlan, type Plan } from "@/lib/plan";

type Spot = { id: string; name: string; primary_airport_iata: string | null };

export default function NewAlert() {
  const [userId, setUserId] = useState<string | null>(null);
  const [home, setHome] = useState<string>("");
  const [spots, setSpots] = useState<Spot[]>([]);

  // form state
  const [name, setName] = useState("Surf Alert");
  const [spotId, setSpotId] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");
  const [dest, setDest] = useState<string>("");
  const [forecastWindow, setForecastWindow] = useState<number>(5);
  const [minWave, setMinWave] = useState<number>(1.2);
  const [maxWind, setMaxWind] = useState<number>(25);
  const [minN, setMinN] = useState<number>(2);
  const [maxN, setMaxN] = useState<number>(14);
  const [daysMask, setDaysMask] = useState<number>(127); // all days
  const [originError, setOriginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [maxPrice, setMaxPrice] = useState<number>(800);

  const isIata = (v: string) => /^[A-Z]{3}$/.test(v);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setPlan(getUserPlan(session));

      if (uid) {
        const { data: urow } = await supabase.from("users")
          .select("home_airport").eq("id", uid).maybeSingle();
        const homeIata = (urow?.home_airport ?? "").toUpperCase();
        setHome(homeIata);
        setOrigin(homeIata);
      }

      // optional: load spots for a select input
      const { data: s } = await supabase
        .from("spots")
        .select("id,name,primary_airport_iata")
        .order("name", { ascending: true });
      setSpots(s ?? []);
    })();
  }, []);

  const weekendsOnly = () => setDaysMask(WEEKENDS); // 0b1100000 = 96

  function onSpotChange(id: string) {
    const s = spots.find(x => x.id === id);
    setSpotId(id);
    setDest((s?.primary_airport_iata || "").toUpperCase());
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const originIata = (origin || "").toUpperCase();
    if (!isIata(originIata)) {
      setOriginError("Please enter a valid 3-letter IATA code (e.g., BOG).");
      return;
    }
    setOriginError(null);
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const row = {
        user_id: user.id,
        name,
        mode: "spot",
        spot_id: spotId || null,
        origin_iata: originIata,
        dest_iata: (dest || "").toUpperCase().slice(0, 3),
        forecast_window: forecastWindow,
        min_wave_m: minWave,
        max_wind_kmh: maxWind,
        min_nights: minN,
        max_nights: Math.max(minN, maxN),
        days_mask: daysMask,
        is_active: true,
        max_price_eur: plan === "premium" ? maxPrice : 300
      };

      const { error } = await supabase.from("alert_rules").insert(row);
      if (error) throw error;
      window.location.href = "/alerts";
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <a
          href="/alerts"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors duration-200 ease-out mb-4"
        >
          ← Back to alerts
        </a>
        <h1 className="text-3xl font-bold text-slate-900">Create new surf alert</h1>
        <p className="mt-2 text-lg text-slate-600">
          Set up intelligent notifications for perfect surf conditions and travel deals
        </p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="space-y-6">
        {/* Alert Details Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>🌊</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Alert Details</h2>
              <p className="text-slate-600">Give your alert a name and select your target surf spot.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-2">
                Alert Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                placeholder="e.g., Pipeline Winter Sessions"
              />
            </div>

            <div>
              <label htmlFor="spot" className="block text-sm font-semibold text-slate-900 mb-2">
                Surf Spot
              </label>
              <select
                id="spot"
                value={spotId}
                onChange={e => onSpotChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                <option value="">Select surf spot</option>
                {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Travel Preferences Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>📍</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Travel Preferences</h2>
              <p className="text-slate-600">Configure your departure location and trip duration.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="origin" className="block text-sm font-semibold text-slate-900 mb-2">
                Origin Airport (IATA)
              </label>
              <AirportAutocomplete
                value={origin}
                onChange={iata => {
                  const upper = iata.toUpperCase();
                  setOrigin(upper);
                  setOriginError(isIata(upper) ? null : "Please enter a valid 3-letter IATA code (e.g., BOG).");
                }}
                placeholder={home || "e.g., LAX"}
              />
              {originError && <p className="mt-1 text-sm text-red-600">{originError}</p>}
            </div>

            <div>
              <label htmlFor="dest" className="block text-sm font-semibold text-slate-900 mb-2">
                Destination Airport (IATA)
              </label>
              <input
                id="dest"
                type="text"
                value={dest}
                onChange={e => setDest(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="auto from spot"
                maxLength={3}
                disabled
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-500 bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="minNights" className="block text-sm font-semibold text-slate-900 mb-2">
                Min Nights
              </label>
              <input
                id="minNights"
                type="number"
                min={1}
                value={minN}
                onChange={e => setMinN(+e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="maxNights" className="block text-sm font-semibold text-slate-900 mb-2">
                Max Nights
              </label>
              <input
                id="maxNights"
                type="number"
                min={minN}
                value={maxN}
                onChange={e => setMaxN(+e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="maxPrice" className="block text-sm font-semibold text-slate-900 mb-2">
                Max Price (€)
              </label>
              <input
                id="maxPrice"
                type="number"
                min={50}
                max={5000}
                step={0.01}
                value={maxPrice}
                onChange={e => setMaxPrice(+e.target.value)}
                disabled={plan !== "premium"}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-slate-50 disabled:text-slate-500"
              />
              {plan !== "premium" && (
                <p className="mt-1 text-sm text-slate-600">
                  <a href="/upgrade" className="text-blue-600 hover:text-blue-700">Upgrade to premium</a> to set custom price limits
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Surf Conditions Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>🌊</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Surf Conditions</h2>
              <p className="text-slate-600">Define your ideal wave and weather conditions.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="forecastWindow" className="block text-sm font-semibold text-slate-900 mb-2">
                Forecast Window (days)
              </label>
              <input
                id="forecastWindow"
                type="number"
                min={1}
                max={10}
                value={forecastWindow}
                onChange={e => setForecastWindow(+e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="minWave" className="block text-sm font-semibold text-slate-900 mb-2">
                Min Wave Height (m)
              </label>
              <input
                id="minWave"
                type="number"
                step="0.1"
                value={minWave}
                onChange={e => setMinWave(+e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="maxWind" className="block text-sm font-semibold text-slate-900 mb-2">
                Max Wind Speed (km/h)
              </label>
              <input
                id="maxWind"
                type="number"
                value={maxWind}
                onChange={e => setMaxWind(+e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-slate-900 mb-3">Days Preference</label>
            <div className="inline-flex rounded-full border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => setDaysMask(127)}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${
                  daysMask === 127 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                All days
              </button>
              <button
                type="button"
                onClick={weekendsOnly}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${
                  daysMask === WEEKENDS 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Weekends only
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-6">
          <a
            href="/alerts"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={!isIata(origin) || isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Creating...
              </div>
            ) : (
              "Create Alert"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
