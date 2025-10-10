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

// Preset mapping by skill level (units: meters for waves, km/h for wind)
const PRESETS_BY_SKILL: Record<"beginner" | "intermediate" | "advanced", { waveMin: number; waveMax: number; windMax: number }> = {
  beginner: { waveMin: 0.8, waveMax: 1.5, windMax: 25 },
  intermediate: { waveMin: 1.2, waveMax: 2.5, windMax: 30 },
  advanced: { waveMin: 2.0, waveMax: 4.0, windMax: 35 },
};

type Spot = { 
  id: string; 
  name: string; 
  primary_airport_iata: string | null;
  region_major: string | null;
  country: string | null;
  skill_level_min: SkillLevel | null;
  skill_level_max: SkillLevel | null;
  // Legacy single value, used as fallback until DB migration is complete
  skill_level?: SkillLevel;
};

type AlertRule = {
  id: string;
  name: string;
  spot_id: string;
  origin_iata: string;
  dest_iata: string;
  is_active: boolean;
  spot_name?: string;
};

export default function NewAlert() {
  const { tier, loading: tierLoading } = useTier();
  const usageData = useAlertUsage(tier);
  const { created, atCreateCap, loading: usageLoading } = usageData;
  const createdMax = usageData.createdMax || 3;
  const isPro = (tier || 'free') === 'pro' || (tier || 'free') === 'unlimited';
  const { options: windowOptions, defaultValue: defaultWindow } = useWindowCategories(tier);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [home, setHome] = useState<string>("");
  const [spots, setSpots] = useState<Spot[]>([]);
  const [filteredSpots, setFilteredSpots] = useState<Spot[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");

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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasModifiedCustomInputs, setHasModifiedCustomInputs] = useState(false);
  const [hasSelectedProWindow, setHasSelectedProWindow] = useState(false);
  
  // Pause Alert Modal state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<AlertRule[]>([]);
  const [selectedAlertToPause, setSelectedAlertToPause] = useState<string | null>(null);
  const [isPausing, setIsPausing] = useState(false);

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

      // Load all spots (try new schema first; fallback to legacy if columns not present)
      let rows: Spot[] = [];
      try {
        const { data: sNew, error: eNew } = await supabase
        .from("spots")
          .select("id,name,primary_airport_iata,region_major,country,skill_level_min,skill_level_max")
        .order("name", { ascending: true });
        if (eNew) throw eNew;
        rows = (sNew ?? []).map((row: any) => ({
          ...row,
          skill_level_min: row.skill_level_min ?? null,
          skill_level_max: row.skill_level_max ?? null,
        })) as Spot[];
      } catch (_e) {
        const { data: sOld } = await supabase
          .from("spots")
          .select("id,name,primary_airport_iata,region_major,country,skill_level")
          .order("name", { ascending: true });
        rows = (sOld ?? []).map((row: any) => {
          const legacy = row.skill_level as SkillLevel | null;
          return { ...row, skill_level_min: legacy, skill_level_max: legacy } as Spot;
        });
      }

      setSpots(rows);

      // Build unique regions list
      const rset = new Set<string>();
      for (const sp of rows) {
        if (sp.region_major) rset.add(sp.region_major);
      }
      setRegions(Array.from(rset).sort((a, b) => a.localeCompare(b)));
    })();
  }, []);

  // Recompute regions whenever spots update
  useEffect(() => {
    const rset = new Set<string>();
    for (const sp of spots) {
      const r = (sp.region_major || "").trim();
      if (r) rset.add(r);
    }
    setRegions(Array.from(rset).sort((a, b) => a.localeCompare(b)));
  }, [spots]);

  // Update country options when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setCountries([]);
      return;
    }
    const cset = new Set<string>();
    for (const sp of spots) {
      if ((sp.region_major || "").trim() === selectedRegion && sp.country) cset.add((sp.country || "").trim());
    }
    setCountries(Array.from(cset).sort((a, b) => a.localeCompare(b)));
    // Clear country and spot when region changes
    setSelectedCountry("");
    setSelectedSpot(null);
  }, [selectedRegion, spots]);

  // Filter spots based on selected skill and location
  useEffect(() => {
    if (!selectedSkill) { setFilteredSpots([]); return; }

    const levelIndex: Record<SkillLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 } as const;
    const selIdx = levelIndex[selectedSkill];

    const pass = spots.filter((sp) => {
      if (!sp.skill_level_min || !sp.skill_level_max) return false;
      const minIdx = levelIndex[sp.skill_level_min as SkillLevel];
      const maxIdx = levelIndex[sp.skill_level_max as SkillLevel];
      const levelOk = selIdx >= minIdx && selIdx <= maxIdx;
      const regionOk = selectedRegion ? sp.region_major === selectedRegion : true;
      const countryOk = selectedCountry ? sp.country === selectedCountry : true;
      return levelOk && regionOk && countryOk;
    }).sort((a, b) => {
      const idx = (lvl: SkillLevel) => levelIndex[lvl];
      const dist = (sp: Spot) => Math.min(Math.abs(idx(sp.skill_level_min as SkillLevel) - selIdx), Math.abs(idx(sp.skill_level_max as SkillLevel) - selIdx));
      return dist(a) - dist(b) || a.name.localeCompare(b.name);
    });

    setFilteredSpots(pass);
  }, [selectedSkill, selectedRegion, selectedCountry, spots]);

  // Update forecast window when tier changes
  useEffect(() => {
    setForecastWindow(defaultWindow);
  }, [defaultWindow]);

  // For FREE users: when skill changes and custom inputs haven't been modified, populate Step 5 with the correct presets
  useEffect(() => {
    if (isPro) return;
    if (!selectedSkill) return;
    if (hasModifiedCustomInputs) return; // do not overwrite user-edited values

    const preset = PRESETS_BY_SKILL[selectedSkill];
    setMinWave(preset.waveMin);
    setMaxWave(preset.waveMax);
    setMaxWind(preset.windMax);
  }, [selectedSkill, isPro, hasModifiedCustomInputs]);


  function onSpotChange(id: string) {
    const spot = spots.find(x => x.id === id);
    setSelectedSpot(spot || null);
  }

  const canSubmit = () => {
    return selectedSkill && selectedSpot && isIata(origin);
  };
  
  // Fetch active alerts for pause modal
  const fetchActiveAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from("alert_rules")
        .select(`
          id, name, spot_id, origin_iata, dest_iata, is_active,
          spots!inner(name)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const alerts = (data ?? []).map(rule => ({
        ...rule,
        spot_name: rule.spots?.[0]?.name || 'Unknown spot',
        spots: undefined
      }));
      
      setActiveAlerts(alerts);
      // Auto-select first alert for free users (they only have 1 anyway)
      if (alerts.length === 1) {
        setSelectedAlertToPause(alerts[0].id);
      }
    } catch (err) {
      console.error('Error fetching active alerts:', err);
    }
  };
  
  // Pause selected alert and continue with creation
  const pauseAlertAndContinue = async () => {
    if (!selectedAlertToPause) return;
    
    setIsPausing(true);
    try {
      // Pause indefinitely (no paused_until date)
      const { error } = await supabase
        .from("alert_rules")
        .update({ 
          is_active: false
        })
        .eq("id", selectedAlertToPause);
      
      if (error) throw error;
      
      // Close modal and proceed with submit
      setShowPauseModal(false);
      setIsPausing(false);
      
      // Now actually submit the new alert
      await submitNewAlert();
    } catch (err) {
      console.error('Error pausing alert:', err);
      setSubmitError((err as Error).message);
      setIsPausing(false);
    }
  };

  // Progress calculation for wizard steps
  const calculateProgress = () => {
    const steps = [
      { id: 1, name: 'Skill', completed: !!selectedSkill },
      { id: 2, name: 'Location', completed: !!selectedRegion },
      { id: 3, name: 'Spot', completed: !!selectedSpot },
      { id: 4, name: 'Forecast', completed: !!selectedSpot && forecastWindow > 0 }, // Only completed after spot is selected
      { id: 5, name: 'Trip', completed: !!name && !!origin && isIata(origin.toUpperCase()) },
      { id: 6, name: 'Conditions', completed: !!name && !!origin && isIata(origin.toUpperCase()) }, // Mark complete when trip basics are done
    ];
    
    const completed = steps.filter(s => s.completed).length;
    return { completed, total: steps.length, steps, percentage: (completed / steps.length) * 100 };
  };

  const progress = calculateProgress();

  const submitWithPreset = async () => {
    // For FREE users: submit with preset conditions and default forecast window
    setShowUpgradeModal(false);
    setOriginError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    
    // Reset forecast window to free tier default (5 days)
    const finalForecastWindow = 5;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
    
    const originIata = (origin || "").toUpperCase();
      
      // Prepare form values with PRESET conditions
      const formValues: FormValues = {
        name,
        spotId: selectedSpot?.id || null,
        originIata: originIata,
        destIata: (selectedSpot?.primary_airport_iata || "").toUpperCase().slice(0, 3) || null,
        daysMask,
        windowDays: 5,
        // Send explicit preset values so cards and forecast reflect the chosen skill
        waveMin: selectedSkill ? PRESETS_BY_SKILL[selectedSkill].waveMin : undefined,
        waveMax: selectedSkill ? PRESETS_BY_SKILL[selectedSkill].waveMax : undefined,
        windMax: selectedSkill ? PRESETS_BY_SKILL[selectedSkill].windMax : undefined,
        maxPrice: undefined,
        planningLogic: 'conservative',
      };

      const payload = buildAlertPayload(formValues, tier);

      const { error } = await supabase.from("alert_rules").insert([payload]);
      if (error) throw error;
      
      window.location.href = "/alerts";
    } catch (err) {
      console.error(err);
      setSubmitError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extracted logic to actually create the alert
  const submitNewAlert = async () => {
    const originIata = (origin || "").toUpperCase();
    
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
        daysMask,
        windowDays: (!isPro ? 5 : (forecastWindow as 5 | 10 | 16)),
        // For Free: store chosen preset explicitly; For Pro: send custom values
        waveMin: isPro ? minWave : (selectedSkill ? PRESETS_BY_SKILL[selectedSkill].waveMin : undefined),
        waveMax: isPro ? maxWave : (selectedSkill ? PRESETS_BY_SKILL[selectedSkill].waveMax : undefined),
        windMax: isPro ? maxWind : (selectedSkill ? PRESETS_BY_SKILL[selectedSkill].windMax : undefined),
        maxPrice: isPro ? maxPrice : undefined,
        planningLogic: isPro ? planningLogic : 'conservative',
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;
    
    const originIata = (origin || "").toUpperCase();
    if (!isIata(originIata)) {
      setOriginError("Please enter a valid 3-letter IATA code (e.g., BOG).");
      return;
    }
    
    // Check if user is at active cap - show pause modal
    const { active, activeMax } = usageData;
    if (active >= activeMax) {
      await fetchActiveAlerts();
      setShowPauseModal(true);
      return;
    }
    
    // For FREE users who modified custom inputs OR selected Pro window: show upgrade modal
    if (!isPro && (hasModifiedCustomInputs || hasSelectedProWindow)) {
      setShowUpgradeModal(true);
      return;
    }
    
    // Otherwise, proceed with submission
    await submitNewAlert();
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

      {/* Progress Indicator (sticky) */}
      <div className="sticky top-4 z-20 rounded-2xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-teal-50 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-700">Setup Progress</span>
          <span className="text-sm font-semibold text-blue-600">
            {progress.completed} of {progress.total} completed
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative h-3 bg-white rounded-full overflow-hidden shadow-inner mb-4">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-teal-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress.percentage}%` }}
          >
            <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
          </div>
        </div>
        
        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {progress.steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div className={`flex-1 h-0.5 -ml-2 transition-colors duration-300 ${
                    progress.steps[index - 1].completed ? 'bg-blue-500' : 'bg-slate-200'
                  }`} />
                )}
                <div className={`
                  relative z-10 flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all duration-300
                  ${step.completed 
                    ? 'bg-gradient-to-br from-blue-500 to-teal-500 text-white shadow-lg scale-110' 
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                  }
                `}>
                  {step.completed ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                {index < progress.steps.length - 1 && (
                  <div className={`flex-1 h-0.5 -mr-2 transition-colors duration-300 ${
                    step.completed ? 'bg-blue-500' : 'bg-slate-200'
                  }`} />
                )}
              </div>
              <span className={`mt-2 text-xs font-medium transition-colors duration-300 ${
                step.completed ? 'text-blue-600' : 'text-slate-500'
              }`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Banner */}
      <UsageBanner />

      {/* Form */}
      <form onSubmit={submit} className="space-y-8">
        {/* Skill Selection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
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

        {/* Location Selection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>🌍</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">2. Choose your location</h2>
              <p className="text-slate-600">Select a region, then a country to narrow down spots.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Region</label>
              <select
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                disabled={!selectedSkill}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:border-slate-300 transition-colors duration-200"
              >
                <option value="">{selectedSkill ? "Select region" : "Choose skill level first"}</option>
                {regions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Country</label>
              <select
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                disabled={!selectedRegion}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:border-slate-300 transition-colors duration-200"
              >
                <option value="">{selectedRegion ? "All countries" : "Select region first"}</option>
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Spot Selection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>📍</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">3. Choose your surf spot</h2>
              <p className="text-slate-600">Spots matching your skill and location.</p>
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:border-slate-300 transition-colors duration-200"
              >
                <option value="">{selectedSkill ? (selectedRegion ? "Select surf spot" : "Choose region first") : "Choose skill level first"}</option>
                {filteredSpots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* No range disclosure here; we label with chosen skill only */}
          </div>
        </div>

        {/* Forecast Window */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
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
            onChange={(val) => {
              setForecastWindow(val);
              // Track if FREE user selected a Pro-only window (10 or 16 days);
              // reset flag when user goes back to 5 days so they can proceed without upgrade
              if (!isPro) {
                setHasSelectedProWindow(val === 10 || val === 16);
              }
            }}
          />
        </div>

        {/* Trip Basics */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>✈️</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">4. Trip basics</h2>
              <p className="text-slate-600">Set your travel details and preferences.</p>
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-500 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors duration-200"
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

          </div>
        </div>

        {/* Custom Conditions (Section 5) - Separate section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl" aria-hidden>⚙️</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  5. Custom Conditions {!isPro && <span className="text-slate-500 font-normal text-base">(Pro Feature)</span>}
                </h2>
                {!isPro && (
                  <span className="text-2xl" aria-label="Locked">🔒</span>
                )}
              </div>
              <p className="text-slate-600 mt-1">Fine-tune surf conditions and price thresholds.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Inline reminder for FREE users */}
            {!isPro && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">💡 Currently using {selectedSkill || 'preset'} conditions.</span> Unlock full customization with Pro!
                </p>
                <a 
                  href="/upgrade"
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 underline whitespace-nowrap ml-4"
                >
                  Upgrade to Pro →
                </a>
              </div>
            )}
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                  <label htmlFor="minWave" className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    Wave min/max {!isPro && <span className="text-xs">🔒</span>}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        id="minWave"
                        type="number"
                        step="0.1"
                        value={minWave}
                      onChange={e => {
                        setMinWave(+e.target.value);
                        if (!isPro) setHasModifiedCustomInputs(true);
                      }}
                        placeholder="Min (m)"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors duration-200"
                      />
                      <input
                        id="maxWave"
                        type="number"
                        step="0.1"
                        value={maxWave}
                      onChange={e => {
                        setMaxWave(+e.target.value);
                        if (!isPro) setHasModifiedCustomInputs(true);
                      }}
                        placeholder="Max (m)"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors duration-200"
                      />
                    </div>
                  </div>

                  <div>
                  <label htmlFor="maxWind" className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    Wind max {!isPro && <span className="text-xs">🔒</span>}
                    </label>
                    <input
                      id="maxWind"
                      type="number"
                      value={maxWind}
                    onChange={e => {
                      setMaxWind(+e.target.value);
                      if (!isPro) setHasModifiedCustomInputs(true);
                    }}
                      placeholder="km/h"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors duration-200"
                    />
                  </div>

                  <div className="md:col-span-2">
                  <label htmlFor="maxPrice" className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    Max Price ($) {!isPro && <span className="text-xs">🔒</span>}
                    </label>
                    <input
                      id="maxPrice"
                      type="number"
                      min={50}
                      step={0.01}
                    value={!isPro && !hasModifiedCustomInputs ? '' : (maxPrice || '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || val === '0') {
                        setMaxPrice(0);
                      } else {
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed)) {
                          setMaxPrice(parsed);
                        }
                      }
                      if (!isPro) setHasModifiedCustomInputs(true);
                    }}
                      placeholder={!isPro ? "Not enforced on Free — we’ll find a reasonable fare. Upgrade to set a price cap." : "e.g., 800"}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors duration-200"
                    />
                    {!isPro && (
                      <p className="mt-2 text-xs text-slate-600">
                        Free plan doesn’t enforce a max price. We surface the cheapest or a reasonable fare. Upgrade to Pro to apply a strict price cap.
                      </p>
                    )}
                  </div>
                
                  {/* Planning Logic */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      Planning logic {!isPro && <span className="text-xs">🔒</span>}
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: 'conservative', label: 'Conservative', desc: 'Avg wave in range, Max wind ≤ limit' },
                        { key: 'aggressive', label: 'Aggressive', desc: 'Min wave in range, Avg wind ≤ limit' },
                        { key: 'optimistic', label: 'Optimistic', desc: 'Avg wave in range, Avg wind ≤ limit' },
                      ].map(opt => (
                        <label key={opt.key} className={`cursor-pointer flex items-start gap-2 p-3 rounded-lg border-2 transition-all ${planningLogic === opt.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                          <input
                            type="radio"
                            name="planning_logic"
                            value={opt.key}
                            checked={planningLogic === opt.key}
                            onChange={() => {
                              setPlanningLogic(opt.key);
                              if (!isPro && opt.key !== 'conservative') setHasModifiedCustomInputs(true);
                            }}
                            disabled={!isPro && opt.key !== 'conservative'}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-semibold text-slate-900">{opt.label}</div>
                            <div className="text-xs text-slate-600">{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              </div>

        {/* Summary (non-sticky at bottom) */}
            {selectedSkill && (
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-teal-50 p-6 shadow-lg mt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">📋</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Alert Summary</h3>
                <div className="space-y-2">
                  <p className="text-sm text-slate-800 font-medium">
                    {isPro ? (
                      // Pro/Unlimited: Dynamic message based on custom inputs
                      <>
                        🌊 Waves: <span className="font-bold text-blue-600">{minWave}–{maxWave} m</span>
                        {' • '}
                        💨 Wind: <span className="font-bold text-blue-600">≤{maxWind} km/h</span>
                        {' • '}
                        📅 Within: <span className="font-bold text-blue-600">{forecastWindow} days</span>
                        {maxPrice > 0 && (
                          <>
                            {' • '}
                            ✈️ Flights: <span className="font-bold text-blue-600">under ${maxPrice}</span>
                          </>
                        )}
                      </>
                    ) : (
                      // Free: Static preset message
                      <>
                        🌊 Waves: <span className="font-bold text-blue-600">
                          {selectedSkill === 'beginner' ? '0.8–1.5' : selectedSkill === 'intermediate' ? '1.2–2.5' : '2.0–4.0'} m
                        </span>
                        {' • '}
                        💨 Wind: <span className="font-bold text-blue-600">
                          ≤{selectedSkill === 'beginner' ? '25' : selectedSkill === 'intermediate' ? '30' : '35'} km/h
                        </span>
                        {' • '}
                        📅 Within: <span className="font-bold text-blue-600">5 days</span>
                        <span className="text-xs text-slate-600"> ({selectedSkill} preset)</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-slate-600">
                    {forecastWindow <= 5 ? '✓ High confidence forecast' : forecastWindow <= 10 ? '○ Medium confidence forecast' : '◐ Trend guidance'}
                  </p>
                  {!isPro && (
                    <p className="text-xs text-blue-700 font-semibold mt-2">
                      💎 Upgrade to Pro for custom price thresholds & advanced conditions
                    </p>
            )}
          </div>
        </div>
            </div>
          </div>
        )}

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

      {/* Upgrade Modal for FREE users who modified custom inputs */}
      {showUpgradeModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💎</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Unlock Full Customization
              </h3>
              <p className="text-slate-600">
                {hasModifiedCustomInputs && hasSelectedProWindow 
                  ? "You've customized your alert conditions and forecast window!"
                  : hasModifiedCustomInputs 
                  ? "You've customized your alert conditions!"
                  : "You've selected an extended forecast window!"}
              </p>
            </div>

            {/* What they adjusted */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-900">Your custom settings:</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {hasModifiedCustomInputs && (
                  <>
                    <li>• Waves: {minWave}–{maxWave} m</li>
                    <li>• Wind: ≤{maxWind} km/h</li>
                    {maxPrice > 0 && <li>• Max Price: ${maxPrice}</li>}
                  </>
                )}
                {hasSelectedProWindow && (
                  <li>• Forecast Window: {forecastWindow === 10 ? 'Swell Watch (6–10 days)' : 'Long Watch (11–16 days)'}</li>
                )}
              </ul>
              <p className="text-xs text-slate-500 mt-2">
                {hasModifiedCustomInputs 
                  ? `Free plan uses preset conditions: ${selectedSkill === 'beginner' ? '0.8–1.5' : selectedSkill === 'intermediate' ? '1.2–2.5' : '2.0–4.0'} m waves, ≤${selectedSkill === 'beginner' ? '25' : selectedSkill === 'intermediate' ? '30' : '35'} km/h wind`
                  : `Free plan uses High Confidence (0–5 days) forecast window`
                }
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <a
                href="/upgrade"
                className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 px-6 py-3 text-white font-semibold hover:from-blue-700 hover:to-teal-700 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
              >
                ✨ Upgrade to Pro - Save Custom Conditions
              </a>
              
              <button
                type="button"
                onClick={submitWithPreset}
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-transparent"></div>
                    Creating...
                  </div>
                ) : (
                  `Continue with ${selectedSkill || 'Preset'} Conditions`
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Alert Modal */}
      {showPauseModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowPauseModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⏸️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Active Alert Limit Reached
              </h3>
              <p className="text-slate-600">
                {activeAlerts.length === 1 
                  ? "You have 1 active alert. Pause it to create this new one?"
                  : `You have ${activeAlerts.length} active alerts. Select one to pause to create this new one.`}
              </p>
            </div>

            {/* Alert selection */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
              {activeAlerts.length === 1 ? (
                // Free users: Show single alert info
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="font-semibold text-slate-900">{activeAlerts[0].name}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {activeAlerts[0].spot_name} • {activeAlerts[0].origin_iata} → {activeAlerts[0].dest_iata}
                  </p>
                </div>
              ) : (
                // Pro users: Radio list of alerts
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 mb-2">Select an alert to pause:</p>
                  {activeAlerts.map(alert => (
                    <label 
                      key={alert.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedAlertToPause === alert.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pauseAlert"
                        value={alert.id}
                        checked={selectedAlertToPause === alert.id}
                        onChange={() => setSelectedAlertToPause(alert.id)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{alert.name}</p>
                        <p className="text-sm text-slate-600">
                          {alert.spot_name} • {alert.origin_iata} → {alert.dest_iata}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Info message */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The selected alert will be paused. You can reactivate it anytime from your alerts dashboard.
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={pauseAlertAndContinue}
                disabled={!selectedAlertToPause || isPausing}
                className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-white font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              >
                {isPausing ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Pausing...
                  </div>
                ) : (
                  "Pause & Continue"
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
