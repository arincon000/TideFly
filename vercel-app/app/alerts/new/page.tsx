"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import { useTier, type Tier } from "@/lib/tier/useTier";
import { useAlertUsage } from "@/lib/alerts/useAlertUsage";
import { useWindowCategories, DAYS_PREFS, daysMask } from "@/lib/alerts/useWindowCategories";
import SkillChips, { type SkillLevel } from "@/components/alerts/SkillChips";
import WindowRadios from "@/components/alerts/WindowRadios";
import UsageBanner from "@/components/alerts/UsageBanner";
import { buildAlertPayload, type FormValues } from "@/lib/alerts/payload";

type Spot = { 
  id: string; 
  name: string; 
  primary_airport_iata: string | null;
  skill_level: SkillLevel;
};

export default function NewAlert() {
  const { tier, loading: tierLoading } = useTier();
  const { created, createdMax, atCreateCap, loading: usageLoading } = useAlertUsage(tier);
  const isPro = tier === 'pro';
  const { options: windowOptions, defaultValue: defaultWindow } = useWindowCategories(tier);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [home, setHome] = useState<string>("");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [filteredSpots, setFilteredSpots] = useState<Spot[]>([]);

  // Form state
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [forecastWindow, setForecastWindow] = useState<number>(defaultWindow);
  const [name, setName] = useState("Surf Alert");
  const [origin, setOrigin] = useState<string>("");
  // Removed minN/maxN - not used in worker logic and can hide good conditions
  const [daysMask, setDaysMask] = useState<number>(DAYS_PREFS.all.mask); // all days
  
  // Pro-only fields
  const [minWave, setMinWave] = useState<number>(1.2);
  const [maxWave, setMaxWave] = useState<number>(2.5);
  const [maxWind, setMaxWind] = useState<number>(25);
  const [maxPrice, setMaxPrice] = useState<number>(800);
  const [planningLogic, setPlanningLogic] = useState<string>("conservative");
  const [showPlanningHelp, setShowPlanningHelp] = useState<boolean>(false);
  
  const [originError, setOriginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isIata = (v: string) => /^[A-Z]{3}$/.test(v);
  const isLoading = tierLoading || usageLoading;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: urow } = await supabase.from("users")
          .select("home_airport").eq("id", uid).maybeSingle();
        const homeIata = (urow?.home_airport ?? "").toUpperCase();
        setHome(homeIata);
        setOrigin(homeIata);
      }

      // Load all spots
      const { data: s } = await supabase
        .from("spots")
        .select("id,name,primary_airport_iata,skill_level")
        .order("name", { ascending: true });
      setSpots(s ?? []);
    })();
  }, []);

  // Filter spots based on selected skill
  useEffect(() => {
    if (selectedSkill) {
      const filtered = spots.filter(spot => spot.skill_level === selectedSkill);
      setFilteredSpots(filtered);
    } else {
      setFilteredSpots([]);
    }
  }, [selectedSkill, spots]);

  // Update forecast window when tier changes
  useEffect(() => {
    setForecastWindow(defaultWindow);
  }, [defaultWindow]);


  function onSpotChange(id: string) {
    const spot = spots.find(x => x.id === id);
    setSelectedSpot(spot || null);
  }

  const canSubmit = () => {
    return selectedSkill && selectedSpot && isIata(origin) && !atCreateCap;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (atCreateCap || !canSubmit()) return;
    
    const originIata = (origin || "").toUpperCase();
    if (!isIata(originIata)) {
      setOriginError("Please enter a valid 3-letter IATA code (e.g., BOG).");
      return;
    }
    
    setOriginError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Prepare form values
      const formValues: FormValues = {
        name,
        spotId: selectedSpot?.id || null,
        originIata: originIata,
        destIata: (selectedSpot?.primary_airport_iata || "").toUpperCase().slice(0, 3) || null,
        minNights: 2,  // Default minimum nights
        maxNights: 14, // Default maximum nights
        daysMask,
        windowDays: (!isPro ? 5 : (forecastWindow as 5 | 10 | 16)),
        // Pro optional vals
        waveMin: isPro ? minWave : undefined,
        waveMax: isPro ? maxWave : undefined,
        windMax: isPro ? maxWind : undefined,
        maxPrice: isPro ? maxPrice : undefined,
        planningLogic: isPro ? planningLogic : undefined,
      };

      const payload = buildAlertPayload(formValues, tier);

      const { error } = await supabase.from("alert_rules").insert([payload]);
      if (error) throw error;
      
      window.location.href = "/alerts";
    } catch (err) {
      console.error(err);
      const errorMessage = (err as Error).message;
      
      // Parse DB errors for user-friendly messages
      if (errorMessage.includes('alert_rules_guard_tier')) {
        if (errorMessage.includes('max alerts')) {
          setSubmitError("You've reached your alert limit. Upgrade to Pro to create more alerts.");
        } else if (errorMessage.includes('forecast window')) {
          setSubmitError("Free users can only use forecast windows of 0-5 days. Upgrade to Pro for longer forecasts.");
        } else if (errorMessage.includes('custom fields')) {
          setSubmitError("Free users cannot set custom wave, wind, or price limits. Upgrade to Pro for full customization.");
        } else {
          setSubmitError("This alert configuration is not allowed on your current plan. Please upgrade to Pro.");
        }
      } else {
        setSubmitError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

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

      {/* Usage Banner */}
      <UsageBanner />

      {/* Form */}
      <form onSubmit={submit} className="space-y-8">
        {/* Skill Selection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>🏄‍♂️</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">1. Choose your skill level</h2>
              <p className="text-slate-600">Select your surfing ability to get appropriate wave and wind presets.</p>
            </div>
          </div>
          
          <SkillChips 
            selectedSkill={selectedSkill} 
            onSkillChange={setSelectedSkill} 
          />
        </div>

        {/* Spot Selection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>📍</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">2. Choose your surf spot</h2>
              <p className="text-slate-600">Select your destination from spots matching your skill level.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="spot" className="block text-sm font-semibold text-slate-900 mb-2">
                Surf Spot
              </label>
              <select
                id="spot"
                value={selectedSpot?.id || ""}
                onChange={e => onSpotChange(e.target.value)}
                disabled={!selectedSkill}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">
                  {selectedSkill ? "Select surf spot" : "Choose skill level first"}
                </option>
                {filteredSpots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.skill_level})
                  </option>
                ))}
              </select>
            </div>

            {selectedSpot && selectedSpot.skill_level !== selectedSkill && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This spot is categorized as <span className="font-semibold">{selectedSpot.skill_level}</span>. 
                  We'll use its category presets.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Forecast Window */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>🌊</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">3. Forecast window</h2>
              <p className="text-slate-600">Choose how far ahead to look for surf conditions.</p>
              <p className="text-xs text-slate-500 mt-1">
                💡 <strong>Tip:</strong> Shorter windows (5 days) = higher confidence. Longer windows (16 days) = more opportunities but less certain.
              </p>
            </div>
          </div>
          
          <WindowRadios
            tier={tier}
            categories={windowOptions}
            value={forecastWindow}
            onChange={setForecastWindow}
          />
        </div>

        {/* Travel & Options */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>✈️</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">4. Travel details</h2>
              <p className="text-slate-600">Configure your travel preferences and optional custom settings.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Alert Name */}
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

            {/* Travel Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="origin" className="block text-sm font-semibold text-slate-900 mb-2">
                  Origin airport (IATA)
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
                  value={selectedSpot?.primary_airport_iata || ""}
                  placeholder="auto from spot"
                  maxLength={3}
                  disabled
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-500 bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                />
              </div>

              {/* Removed Min/Max Nights - not used in worker logic and can hide good conditions */}
            </div>

            {/* Days Preference */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">Days Preference</label>
              <div className="inline-flex rounded-full border border-slate-200 p-1">
                <button
                  type="button"
                  onClick={() => setDaysMask(DAYS_PREFS.all.mask)}
                  className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${
                    daysMask === DAYS_PREFS.all.mask 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {DAYS_PREFS.all.label}
                </button>
                <button
                  type="button"
                  onClick={() => setDaysMask(DAYS_PREFS.weekends.mask)}
                  className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${
                    daysMask === DAYS_PREFS.weekends.mask 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {DAYS_PREFS.weekends.label}
                </button>
              </div>
            </div>

            {/* Pro-only custom fields */}
            {isPro && (
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Custom Conditions (Pro)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="minWave" className="block text-sm font-semibold text-slate-900 mb-2">
                      Wave min/max
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        id="minWave"
                        type="number"
                        step="0.1"
                        value={minWave}
                        onChange={e => setMinWave(+e.target.value)}
                        placeholder="Min (m)"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                      />
                      <input
                        id="maxWave"
                        type="number"
                        step="0.1"
                        value={maxWave}
                        onChange={e => setMaxWave(+e.target.value)}
                        placeholder="Max (m)"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="maxWind" className="block text-sm font-semibold text-slate-900 mb-2">
                      Wind max
                    </label>
                    <input
                      id="maxWind"
                      type="number"
                      value={maxWind}
                      onChange={e => setMaxWind(+e.target.value)}
                      placeholder="km/h"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Planning Logic (Pro)
                    </label>
                    <p className="text-xs text-slate-600 mb-3">
                      Choose how we evaluate forecast data against your conditions. 
                      <button 
                        type="button"
                        onClick={() => setShowPlanningHelp(!showPlanningHelp)}
                        className="text-blue-600 underline ml-1"
                      >
                        {showPlanningHelp ? 'Hide details' : 'Show details'}
                      </button>
                    </p>
                    
                    {showPlanningHelp && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">How Planning Logic Works:</h4>
                        <div className="text-xs text-blue-800 space-y-1">
                          <p><strong>Conservative:</strong> Uses average wave height + maximum wind speed. Best for planning trips - avoids disappointment from windy conditions.</p>
                          <p><strong>Optimistic:</strong> Uses average wave height + average wind speed. More alerts but may include marginal conditions.</p>
                          <p><strong>Aggressive:</strong> Uses minimum wave height + average wind speed. Maximum alerts but includes very marginal conditions.</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          id="planning-conservative"
                          name="planning-logic"
                          value="conservative"
                          checked={planningLogic === "conservative"}
                          onChange={e => setPlanningLogic(e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <label htmlFor="planning-conservative" className="text-sm font-medium text-slate-900">
                            Conservative (Recommended)
                          </label>
                          <p className="text-xs text-slate-600">
                            Uses average wave height and maximum wind speed. Best for planning - avoids disappointment from windy conditions.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          id="planning-optimistic"
                          name="planning-logic"
                          value="optimistic"
                          checked={planningLogic === "optimistic"}
                          onChange={e => setPlanningLogic(e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <label htmlFor="planning-optimistic" className="text-sm font-medium text-slate-900">
                            Optimistic
                          </label>
                          <p className="text-xs text-slate-600">
                            Uses average wave height and average wind speed. More alerts but may include marginal conditions.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          id="planning-aggressive"
                          name="planning-logic"
                          value="aggressive"
                          checked={planningLogic === "aggressive"}
                          onChange={e => setPlanningLogic(e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <label htmlFor="planning-aggressive" className="text-sm font-medium text-slate-900">
                            Aggressive
                          </label>
                          <p className="text-xs text-slate-600">
                            Uses minimum wave height and average wind speed. Maximum alerts but includes very marginal conditions.
                          </p>
                        </div>
                      </div>
                    </div>
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
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Free plan note */}
            {!isPro && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Free plan note:</strong> Free plan ignores flight budget; we'll pick a reasonable fare.
                </p>
              </div>
            )}

            {/* Alert Summary */}
            {selectedSkill && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-700">
                  We'll alert you when waves are {selectedSkill === 'beginner' ? '0.8–1.5' : selectedSkill === 'intermediate' ? '1.2–2.5' : '2.0–4.0'} m 
                  and wind is ≤{selectedSkill === 'beginner' ? '25' : selectedSkill === 'intermediate' ? '30' : '35'} km/h ({selectedSkill} preset).
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Local daytime 06:00–18:00 • {forecastWindow <= 5 ? 'Confident: highest forecast skill' : forecastWindow <= 10 ? 'Swell Watch: medium confidence' : 'Long Watch: trend guidance'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{submitError}</p>
          </div>
        )}

        {/* Create Cap Error */}
        {atCreateCap && (
          <div className="mt-3 text-sm text-red-600">
            You've reached your created alerts limit ({created}/{createdMax}) for {tier}. Pause or delete one, or upgrade to Pro.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6">
          <a
            href="/alerts"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            Cancel
          </a>
          
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={!canSubmit() || isSubmitting || atCreateCap}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Creating...
                </div>
              ) : (
                "Create alert"
              )}
            </button>
            
            {!isPro && (
              <a
                href="/upgrade"
                className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-6 py-3 text-white font-semibold hover:bg-teal-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
              >
                Upgrade to Pro
              </a>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
