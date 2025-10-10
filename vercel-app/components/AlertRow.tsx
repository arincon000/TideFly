"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { StatusPill } from "@/components/StatusPill";
import { useTier } from "@/lib/tier/useTier";
import { useAlertUsage } from "@/lib/alerts/useAlertUsage";
import { useRouter } from 'next/navigation';
import { buildAviasalesLink } from "@/lib/affiliates";
import { generateAffiliateUrls } from "@/lib/dateUtils";
import { generateHotelProviderUrls } from "@/lib/hotels";
import { ForecastDetailsModal } from "./ForecastDetailsModal";

export type AlertRule = {
  id: string;
  name: string | null;
  spot_id: string | null;
  origin_iata: string | null;
  dest_iata: string | null;
  destination_iata?: string | null;
  is_active: boolean | null;
  paused_until: string | null;
  forecast_window: number | null;
  max_price_eur?: number | null;
  // Pro-only fields
  wave_min_m?: number | null;
  wave_max_m?: number | null;
  wind_max_kmh?: number | null;
  planning_logic?: string | null;
  // Date fields
  depart_date?: string | null;
  return_date?: string | null;
  // Worker tracking
  created_at?: string | null;
  last_checked_at?: string | null;
  // Spot data (joined)
  spot_name?: string | null;
  spot_country?: string | null;
  iata_city_name?: string | null;
  nearest_city?: string | null;
};

export type RuleStatus = {
  rule_id: string;
  status: string | null;
  price: number | null;
  ok_dates_count: number | null;
  ok_dates?: string[] | null;
  snapped_depart_date?: string | null;
  snapped_return_date?: string | null;
  first_ok?: string | null;
  last_ok?: string | null;
  ok_count?: number | null;
  sent_at: string | null;
  reason?: string | null;
};

// Helper function to determine if an alert is "new" (hasn't been processed by worker yet)
function isNewAlert(rule: AlertRule): boolean {
  // If last_checked_at is null, the worker has never run for this alert
  return !rule.last_checked_at;
}

// Helper function to determine if forecast conditions are good (for revenue optimization)
function hasGoodConditions(forecastData: any[]): boolean {
  if (!forecastData || forecastData.length === 0) return false;
  
  // Check if any day has good conditions (same logic as forecast details)
  return forecastData.some(day => 
    day.wave_ok && day.wind_ok && day.morning_ok
  );
}

export function AlertRow({ rule, status, refresh }: { rule: AlertRule; status?: RuleStatus; refresh: () => void }) {
  console.log('AlertRow: Component rendered with rule.id:', rule.id, 'rule.spot_id:', rule.spot_id);
  
  const { tier, loading: tierLoading, error: tierError } = useTier();
  const usageData = useAlertUsage(tier);
  const { active, atActiveCap } = usageData;
  const activeMax = usageData.activeMax || 1;
  const router = useRouter();
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHotelPicker, setShowHotelPicker] = useState(false);
  const [hotelLinksIata, setHotelLinksIata] = useState<{ provider: string; url: string }[]>([]);
  const [hotelLinksNearest, setHotelLinksNearest] = useState<{ provider: string; url: string }[]>([]);
  const [hotelTab, setHotelTab] = useState<'iata' | 'nearest'>('iata');

  // Fetch forecast data for all alerts to enable consistent affiliate link generation
  useEffect(() => {
    console.log('AlertRow: useEffect triggered - rule.id:', rule.id, 'rule.spot_id:', rule.spot_id);
    
    const fetchForecastData = async () => {
      if (!rule.id) {
        console.log('AlertRow: Skipping forecast fetch - no rule.id');
        return;
      }
      
      try {
        console.log('AlertRow: Fetching forecast data for rule:', rule.id);
        const requestBody = {
          ruleId: rule.id,
          alertRule: {
            spot_id: rule.spot_id,
            wave_min_m: rule.wave_min_m,
            wave_max_m: rule.wave_max_m,
            wind_max_kmh: rule.wind_max_kmh,
            forecast_window: rule.forecast_window,
            origin_iata: rule.origin_iata,
            dest_iata: rule.dest_iata,
            planning_logic: rule.planning_logic,
          }
        };
        console.log('AlertRow: Request body being sent:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(`/api/forecast-details?t=${Date.now()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        if (response.ok) {
          const data = await response.json();
          console.log('AlertRow: Received forecast data:', data.days?.length || 0, 'days');
          setForecastData(data.days || []);
        } else {
          console.error('AlertRow: Forecast fetch failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('AlertRow: Failed to fetch forecast data for revenue optimization:', error);
      }
    };

    if (rule.spot_id && rule.id) {
      fetchForecastData();
    } else {
      console.log('AlertRow: Skipping fetch - missing rule.id or rule.spot_id');
    }
  }, [rule.id, rule.spot_id]);

  // Handle loading or invalid tier
  if (tierLoading || tierError) {
    return null; // or a loading spinner
  }

  const toggleActive = async () => {
    // If trying to resume (activate) and at active cap, show error
    if (!rule.is_active && atActiveCap) {
      alert(`You're at your active limit (${active}/${activeMax}) for ${tier}. Pause/delete another alert, or upgrade to Pro.`);
      return;
    }
    
    await supabase.from("alert_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);
    
    // Force a full page reload to update usage counts
    window.location.reload();
  };


  const onDelete = async () => {
    const { error } = await supabase.from('alert_rules').delete().eq('id', rule.id);
    if (error) {
      console.error(error);
      return;
    }
    setShowDeleteModal(false);
    // Force a full page reload to update usage counts
    window.location.reload();
  };

  // Helper functions
  const getStatusBadge = () => {
    const badge = getStatusBadgeContent();
    const explanation = getStatusExplanation();
    
    return (
      <div className="flex flex-col gap-1">
        {badge}
        {explanation}
      </div>
    );
  };

  const getStatusExplanation = () => {
    if (!status?.reason) return null;
    
    // Only show explanation for non-successful statuses
    if (status.status === 'sent') return null;
    
    return (
      <div className="text-xs text-slate-500 max-w-xs">
        {status.reason}
      </div>
    );
  };

  const getStatusBadgeContent = () => {
    if (rule.paused_until) {
      const untilDate = new Date(rule.paused_until).toLocaleDateString();
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
          ⏰ Snoozed until {untilDate}
        </span>
      );
    }
    
    // Check if this is a new alert (worker hasn't run yet)
    if (isNewAlert(rule)) {
      // Show "Likely Match" if conditions are good (revenue optimization)
      if (hasGoodConditions(forecastData)) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            🎯 Likely Match
          </span>
        );
      }
      // Otherwise show "Processing"
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
          🔄 Processing
        </span>
      );
    }
    
    if (status?.status === 'sent') {
      // Only show "Hit sent" for actual successful matches
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
          Hit sent
        </span>
      );
    }
    if (status?.status === 'no_surf' || status?.status === 'forecast:not_ok') {
      // Check the reason to show appropriate message
      const reason = status.reason;
      if (reason && reason.includes('price too high')) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
            Price too high
          </span>
        );
      } else {
        // Default for no_surf (forecast conditions not met, no surfable mornings, etc.)
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
            No hit
          </span>
        );
      }
    }
    if (status?.status === 'too_pricey') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
          Price too high
        </span>
      );
    }
    if (status?.status === 'forecast_unavailable') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
          No forecast data
        </span>
      );
    }
    if (!rule.is_active) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
          Paused
        </span>
      );
    }
    return null;
  };

  // Use unified date logic for consistent trip duration
  const destIata = rule.dest_iata ?? rule.destination_iata;

  const buildFlightUrl = () => {
    if (!rule.origin_iata || !destIata) {
      console.log('AlertRow: No origin/dest IATA codes');
      return null;
    }
    
    // PRIORITY 1: Use fresh forecast data if available (same as Forecast Details Modal)
    if (forecastData && forecastData.length > 0) {
      try {
        console.log('AlertRow: Using fresh forecast data for flight URL:', forecastData.length, 'days');
        // Extract good days from fresh forecast data
        const goodDays = forecastData
          .filter(day => day.overallOk)
          .map(day => day.date);
        
        console.log('AlertRow: Good days from fresh data:', goodDays);
        if (goodDays.length > 0) {
          const { flightUrl } = generateAffiliateUrls(
            goodDays,
            rule.origin_iata,
            destIata,
            '670448', // Hardcoded affiliate ID for client-side
            `alert_${rule.id}`
          );
          console.log('AlertRow: Generated flight URL from fresh data:', flightUrl);
          return flightUrl;
        }
      } catch (error) {
        console.error('Error generating unified affiliate URLs from fresh data:', error);
        // Fall back to old logic
      }
    } else {
      console.log('AlertRow: No fresh forecast data available, forecastData length:', forecastData?.length || 0);
    }
    
    // PRIORITY 2: Use unified date logic if we have good days from status (cached data)
    if (status?.ok_dates && status.ok_dates.length > 0) {
      try {
        console.log('AlertRow: Using cached status data for flight URL:', status.ok_dates);
        const { flightUrl } = generateAffiliateUrls(
          status.ok_dates,
          rule.origin_iata,
          destIata,
          '670448', // Hardcoded affiliate ID for client-side
          `alert_${rule.id}`
        );
        console.log('AlertRow: Generated flight URL from cached data:', flightUrl);
        return flightUrl;
      } catch (error) {
        console.error('Error generating unified affiliate URLs from cached data:', error);
        // Fall back to old logic
      }
    } else {
      console.log('AlertRow: No cached status data available, ok_dates:', status?.ok_dates);
    }
    
    // PRIORITY 3: Fallback to old logic for alerts without good days
    const departYMD = status?.snapped_depart_date ?? rule.depart_date ?? undefined;
    const returnYMD = status?.snapped_return_date ?? rule.return_date ?? undefined;
    
    console.log('AlertRow: Using fallback logic - departYMD:', departYMD, 'returnYMD:', returnYMD);
    
    if (!departYMD) {
      console.log('AlertRow: No depart date available for fallback');
      return null;
    }
    
    const fallbackUrl = buildAviasalesLink({
      origin: rule.origin_iata,
      dest: destIata,
      departYMD: departYMD,
      returnYMD: returnYMD ?? undefined,
      subId: `alert_${rule.id}`,
    });
    
    console.log('AlertRow: Generated fallback flight URL:', fallbackUrl);
    return fallbackUrl;
  };

  const buildHotelLinks = () => {
    if (!destIata) {
      return [] as { label: string; url: string }[];
    }
    
    // PRIORITY 1: Use fresh forecast data if available (same as Forecast Details Modal)
    if (forecastData && forecastData.length > 0) {
      try {
        // Extract good days from fresh forecast data
        const goodDays = forecastData
          .filter(day => day.overallOk)
          .map(day => day.date);
        
        if (goodDays.length > 0) {
          const { tripDates } = generateAffiliateUrls(
            goodDays,
            rule.origin_iata || 'LIS',
            destIata,
            '670448',
            `alert_${rule.id}`
          );
          const links: { label: string; url: string }[] = [];
          if (rule.iata_city_name) {
            const l = generateHotelProviderUrls({ city: rule.iata_city_name!, checkIn: tripDates.departDate, checkOut: tripDates.returnDate });
            if (l[0]) links.push({ label: `Hotel in ${rule.iata_city_name}`, url: l[0].url });
          }
          if (rule.nearest_city && rule.nearest_city !== rule.iata_city_name) {
            const l2 = generateHotelProviderUrls({ city: rule.nearest_city!, checkIn: tripDates.departDate, checkOut: tripDates.returnDate });
            if (l2[0]) links.push({ label: `Hotel near ${rule.nearest_city}`, url: l2[0].url });
          }
          return links;
        }
      } catch (error) {
        console.error('Error generating unified affiliate URLs from fresh data:', error);
        // Fall back to old logic
      }
    }
    
    // PRIORITY 2: Use unified date logic if we have good days from status (cached data)
    if (status?.ok_dates && status.ok_dates.length > 0) {
      try {
        const { tripDates } = generateAffiliateUrls(
          status.ok_dates,
          rule.origin_iata || 'LIS',
          destIata,
          '670448',
          `alert_${rule.id}`
        );
        const links: { label: string; url: string }[] = [];
        if (rule.iata_city_name) {
          const l = generateHotelProviderUrls({ city: rule.iata_city_name!, checkIn: tripDates.departDate, checkOut: tripDates.returnDate });
          if (l[0]) links.push({ label: `Hotel in ${rule.iata_city_name}`, url: l[0].url });
        }
        if (rule.nearest_city && rule.nearest_city !== rule.iata_city_name) {
          const l2 = generateHotelProviderUrls({ city: rule.nearest_city!, checkIn: tripDates.departDate, checkOut: tripDates.returnDate });
          if (l2[0]) links.push({ label: `Hotel near ${rule.nearest_city}`, url: l2[0].url });
        }
        return links;
      } catch (error) {
        console.error('Error generating unified affiliate URLs from cached data:', error);
        // Fall back to old logic
      }
    }
    
    // PRIORITY 3: Fallback to old logic for alerts without good days
    const departYMD = status?.snapped_depart_date ?? rule.depart_date ?? undefined;
    const returnYMD = status?.snapped_return_date ?? rule.return_date ?? undefined;
    
    if (!returnYMD || !departYMD) {
      return [] as { label: string; url: string }[];
    }
    
    const checkout = new Date(new Date(`${returnYMD}T00:00:00Z`).getTime() + 86400000)
      .toISOString()
      .slice(0, 10);
    const links: { label: string; url: string }[] = [];
    if (rule.iata_city_name) {
      const l = generateHotelProviderUrls({ city: rule.iata_city_name!, checkIn: departYMD, checkOut: checkout });
      if (l[0]) links.push({ label: `Hotel in ${rule.iata_city_name}`, url: l[0].url });
    }
    if (rule.nearest_city && rule.nearest_city !== rule.iata_city_name) {
      const l2 = generateHotelProviderUrls({ city: rule.nearest_city!, checkIn: departYMD, checkOut: checkout });
      if (l2[0]) links.push({ label: `Hotel near ${rule.nearest_city}`, url: l2[0].url });
    }
    return links;
  };

  const getSpotDisplay = () => {
    if (rule.spot_name) {
      return `${rule.spot_name}${rule.spot_country ? ` – ${rule.spot_country}` : ''}`;
    }
    return '—';
  };

  const getSurfableDates = () => {
    // For now, show fallback until backend summary is implemented
    return '—';
  };

  const getWaveDisplay = () => {
    if (rule.wave_min_m !== null && rule.wave_max_m !== null) {
      return `${rule.wave_min_m}–${rule.wave_max_m} m`;
    }
    if (rule.wave_min_m !== null) {
      return `≥ ${rule.wave_min_m} m`;
    }
    return '—';
  };

  const getWindDisplay = () => {
    if (rule.wind_max_kmh !== null) {
      return `≤ ${rule.wind_max_kmh} km/h`;
    }
    return '—';
  };

  const getWindowDisplay = () => {
    const window = rule.forecast_window || 5;
    return `Searching next ${window} days`;
  };

  // Calculate URLs reactively based on current forecast data
  const flightUrl = buildFlightUrl();
  const hotelLinks = buildHotelLinks();

  const openHotelPicker = () => {
    if (!destIata) return;
    // Try fresh data
    if (forecastData && forecastData.length > 0) {
      try {
        const goodDays = forecastData.filter((d: any) => d.overallOk).map((d: any) => d.date);
        if (goodDays.length > 0) {
          const { tripDates } = generateAffiliateUrls(
            goodDays,
            rule.origin_iata || 'LIS',
            destIata,
            '670448',
            `alert_${rule.id}`
          );
          const iata = rule.iata_city_name || destIata;
          const near = rule.nearest_city && rule.nearest_city !== rule.iata_city_name ? rule.nearest_city : null;
          const iataLinks = generateHotelProviderUrls({ city: iata, checkIn: tripDates.departDate, checkOut: tripDates.returnDate });
          const nearLinks = near ? generateHotelProviderUrls({ city: near, checkIn: tripDates.departDate, checkOut: tripDates.returnDate }) : [];
          setHotelLinksIata(iataLinks);
          setHotelLinksNearest(nearLinks);
          setHotelTab('iata');
          setShowHotelPicker(true);
          return;
        }
      } catch {}
    }
    // Try status ok_dates
    if (status?.ok_dates && status.ok_dates.length > 0) {
      try {
        const { tripDates } = generateAffiliateUrls(
          status.ok_dates,
          rule.origin_iata || 'LIS',
          destIata,
          '670448',
          `alert_${rule.id}`
        );
        const iata = rule.iata_city_name || destIata;
        const near = rule.nearest_city && rule.nearest_city !== rule.iata_city_name ? rule.nearest_city : null;
        const iataLinks = generateHotelProviderUrls({ city: iata, checkIn: tripDates.departDate, checkOut: tripDates.returnDate });
        const nearLinks = near ? generateHotelProviderUrls({ city: near, checkIn: tripDates.departDate, checkOut: tripDates.returnDate }) : [];
        setHotelLinksIata(iataLinks);
        setHotelLinksNearest(nearLinks);
        setHotelTab('iata');
        setShowHotelPicker(true);
        return;
      } catch {}
    }
    // Fallback to snapped dates
    const departYMD = status?.snapped_depart_date ?? rule.depart_date ?? undefined;
    const returnYMD = status?.snapped_return_date ?? rule.return_date ?? undefined;
    if (!departYMD || !returnYMD) return;
    const checkout = new Date(new Date(`${returnYMD}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
    const iata = rule.iata_city_name || destIata;
    const near = rule.nearest_city && rule.nearest_city !== rule.iata_city_name ? rule.nearest_city : null;
    const iataLinks = generateHotelProviderUrls({ city: iata, checkIn: departYMD, checkOut: checkout });
    const nearLinks = near ? generateHotelProviderUrls({ city: near, checkIn: departYMD, checkOut: checkout }) : [];
    setHotelLinksIata(iataLinks);
    setHotelLinksNearest(nearLinks);
    setHotelTab('iata');
    setShowHotelPicker(true);
  };

  // Helper to check if we should show spot row
  const shouldShowSpot = rule.spot_name && rule.spot_name !== '—';
  
  // Helper to check if we should show surfable dates row
  const shouldShowSurfableDates = getSurfableDates() !== '—';

  // Helper to get explanation message for failed alerts
  const getExplanationMessage = () => {
    if (!status || status.status === 'sent') return null;
    
    // Show special message for new alerts
    if (isNewAlert(rule)) {
      if (hasGoodConditions(forecastData)) {
        return (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-medium">🎯 Good conditions detected!</span> 
              {' '}You can book flights and hotels now, but price will be verified in the next worker run.
            </p>
            <p className="text-xs text-green-700 mt-2">
              💡 <strong>Revenue optimization:</strong> Book now to secure your trip while conditions are good.
              {' '}Price verification will happen automatically within the next few hours.
            </p>
          </div>
        );
      } else {
        return (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">🔄 Alert is being processed.</span> 
              {' '}The worker will check forecast conditions and flight prices within the next few hours.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              💡 <strong>Forecast data is available now</strong> - click on wave/wind conditions above to see detailed daily breakdown.
              {' '}Price data will be available after the first worker run.
            </p>
          </div>
        );
      }
    }
    
    const waveMin = rule.wave_min_m;
    const waveMax = rule.wave_max_m;
    const windMax = rule.wind_max_kmh;
    
    if (status.status === 'no_surf' || status.status === 'forecast:not_ok') {
      return (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            <span className="font-medium">No surfable conditions found in the next {rule.forecast_window || 5} days.</span> 
            {' '}Your alert requires waves {waveMin ? `${waveMin}-` : 'up to '}{waveMax}m 
            and wind ≤{windMax}km/h, but current forecast conditions don't match these criteria.
          </p>
          <p className="text-xs text-orange-700 mt-2">
            💡 <strong>Planning logic:</strong> Using average wave height and maximum wind speed for conservative planning.
            {' '}Click on wave/wind conditions above to see detailed daily breakdown.
          </p>
        </div>
      );
    }
    
    if (status.status === 'too_pricey') {
      return (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <span className="font-medium">Flight price too high.</span> 
            {' '}Current price is ${status.price?.toFixed(2)} but your alert has a maximum price limit.
          </p>
        </div>
      );
    }
    
    if (status.status === 'forecast_unavailable') {
      return (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-800">
            <span className="font-medium">No forecast data available.</span> 
            {' '}We're unable to get current weather conditions for this spot.
          </p>
        </div>
      );
    }
    
    return null;
  };

  // Build detail items array for auto-fill grid
  const detailItems = [];
  
  if (shouldShowSpot) {
    detailItems.push({
      emoji: '🏄',
      label: 'Spot',
      value: getSpotDisplay(),
      title: getSpotDisplay()
    });
  }
  
  if (shouldShowSurfableDates) {
    detailItems.push({
      emoji: '🗓️',
      label: 'Surfable dates',
      value: getSurfableDates()
    });
  }
  
  detailItems.push({
    emoji: '🌊',
    label: 'Wave',
    value: getWaveDisplay()
  });
  
  detailItems.push({
    emoji: '💨',
    label: 'Wind',
    value: getWindDisplay()
  });
  
  detailItems.push({
    emoji: '⏳',
    label: 'Window',
    value: getWindowDisplay()
  });

  const isPaused = !rule.is_active;

  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all duration-200 border-l-4 cursor-default ${
      isPaused 
        ? 'border-slate-300 border-l-slate-400 bg-slate-50 opacity-60 hover:shadow-md' 
        : 'border-slate-200 border-l-blue-500 bg-white hover:shadow-lg hover:border-slate-300'
    }`} style={{ lineHeight: '1.5' }}>
      {/* Top row - Essentials */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-lg font-semibold truncate ${
              isPaused ? 'text-slate-500' : 'text-slate-900'
            }`} style={{ fontSize: '18px' }}>
              {rule.name ?? "Surf Alert"}
            </h3>
            {getStatusBadge()}
          </div>
          <div className={`text-sm ${isPaused ? 'text-slate-400' : 'text-slate-600'}`}>
            📍 {rule.spot_name || 'Unknown Spot'} {rule.spot_country && `• ${rule.spot_country}`}
          </div>
        </div>
        {status?.price && !isNewAlert(rule) && (
          <div className={`text-lg font-semibold ml-4 ${
            isPaused ? 'text-slate-500' : 'text-slate-700'
          }`} style={{ fontSize: '18px' }}>
            ${status.price.toFixed(2)}
              </div>
            )}
          </div>

      {/* Links row - Chips */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Show booking chips for new alerts with good conditions (revenue optimization) */}
        {(flightUrl || (isNewAlert(rule) && hasGoodConditions(forecastData))) && !isPaused ? (
          <a
            href={flightUrl || '#'}
            target="_blank"
            rel="nofollow sponsored noopener"
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              isNewAlert(rule) && hasGoodConditions(forecastData) && !flightUrl
                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            style={{ fontSize: '15px' }}
            title={isNewAlert(rule) && hasGoodConditions(forecastData) && !flightUrl ? 'Price not yet verified - will be checked in next run' : undefined}
          >
            ✈️ Flight: {rule.origin_iata} → {destIata}
            {isNewAlert(rule) && hasGoodConditions(forecastData) && !flightUrl && ' *'}
          </a>
        ) : (
          <div
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-500 cursor-not-allowed"
            title={isPaused ? "Alert is paused" : "Set dates to enable flight link"}
            style={{ fontSize: '15px' }}
          >
            ✈️ Flight: {rule.origin_iata} → {destIata}
            </div>
          )}
        
        {/* Hotel: single button opens picker (IATA vs Nearest) */}
        {(hotelLinks.length > 0 || (isNewAlert(rule) && hasGoodConditions(forecastData))) && !isPaused ? (
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); openHotelPicker(); }}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200`}
            style={{ fontSize: '15px' }}
          >
            🏨 Book your stay
          </a>
        ) : (
          <div
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-500 cursor-not-allowed"
            title={isPaused ? "Alert is paused" : (status?.snapped_depart_date ? "Need both start & end to build hotel link" : "No surfable days yet")}
            style={{ fontSize: '15px' }}
          >
            🏨 Hotel: your stay in {destIata}
            </div>
          )}
        </div>

        {/* Revenue optimization disclaimer for new alerts with good conditions */}
        {isNewAlert(rule) && hasGoodConditions(forecastData) && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              <span className="font-medium">💰 Revenue Optimization:</span> 
              {' '}Booking links are shown because conditions look good, but prices haven't been verified yet.
              {' '}The worker will check prices in the next run and send you an email if there are any issues.
            </p>
          </div>
        )}

      {/* Details grid - Auto-fill */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {detailItems.map((item, index) => {
          const isClickable = (item.label === 'Wave' || item.label === 'Wind') && !isPaused;
          
          return (
            <div key={index} className="flex items-center gap-2">
              <span className="text-slate-400" aria-hidden style={{ fontSize: '15px' }}>
                {item.emoji}
              </span>
              {isClickable ? (
                <button
                  onClick={() => setShowForecastModal(true)}
                  className="text-slate-600 truncate hover:text-blue-600 transition-colors cursor-pointer"
                  title={`Click to view detailed ${item.label.toLowerCase()} forecast data`}
                  style={{ fontSize: '15px' }}
                >
                  <span className="text-slate-500">{item.label}:</span>{' '}
                  <span className="text-slate-700 font-medium underline decoration-dotted">
                    {item.value}
                  </span>
                </button>
              ) : (
                <span 
                  className="text-slate-600 truncate" 
                  title={item.title}
                  style={{ fontSize: '15px' }}
                >
                  <span className="text-slate-500">{item.label}:</span>{' '}
                  <span className="text-slate-700 font-medium">{item.value}</span>
                </span>
              )}
            </div>
          );
        })}
          </div>
          
      {/* Explanation message for failed alerts */}
      {getExplanationMessage()}
          
      {/* Actions row - Right-aligned */}
      <div className="flex items-center justify-end gap-2">
            <button
              onClick={toggleActive}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          style={{ fontSize: '15px' }}
        >
          <span className="text-slate-400" aria-hidden>
            {rule.is_active ? '⏸' : '▶️'}
          </span>
          {rule.is_active ? 'Pause' : 'Resume'}
            </button>
            
            <button
              onClick={() => window.location.href = `/alerts/new?duplicate=${rule.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          style={{ fontSize: '15px' }}
            >
          <span className="text-slate-400" aria-hidden>📋</span>
              Duplicate
            </button>
        
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-500 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          style={{ fontSize: '15px' }}
        >
          <span className="text-slate-400" aria-hidden>🗑️</span>
          Delete
        </button>
      </div>

      {/* Forecast Details Modal */}
      <ForecastDetailsModal
        isOpen={showForecastModal}
        onClose={() => setShowForecastModal(false)}
        ruleId={rule.id}
        alertRule={{
          spot_id: rule.spot_id,
          origin_iata: rule.origin_iata,
          dest_iata: rule.dest_iata,
          wave_min_m: rule.wave_min_m,
          wave_max_m: rule.wave_max_m,
          wind_max_kmh: rule.wind_max_kmh,
          forecast_window: rule.forecast_window,
          planning_logic: rule.planning_logic,
          iata_city_name: rule.iata_city_name,
          nearest_city: rule.nearest_city
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-2xl">🗑️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete this alert?</h3>
                <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-5">
              <p className="text-sm text-slate-700">
                <span className="font-medium">{rule.name || 'Surf Alert'}</span>
                <br />
                <span className="text-slate-500">{rule.spot_name} • {rule.origin_iata} → {rule.dest_iata || rule.destination_iata}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 font-medium text-white hover:bg-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-lg shadow-red-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hotel Picker Modal */}
      {showHotelPicker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setShowHotelPicker(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900">Choose hotel search</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowHotelPicker(false)}>×</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <button
                className={`px-3 py-1 text-sm rounded-lg ${hotelTab === 'iata' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setHotelTab('iata')}
              >
                IATA city
              </button>
              {hotelLinksNearest.length > 0 && (
                <button
                  className={`px-3 py-1 text-sm rounded-lg ${hotelTab === 'nearest' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setHotelTab('nearest')}
                >
                  Nearest city
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(hotelTab === 'iata' ? hotelLinksIata : hotelLinksNearest).map((l, idx) => (
                <a
                  key={idx}
                  href={l.url}
                  target="_blank"
                  rel="nofollow noopener"
                  className="block w-full text-left px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  {l.provider === 'booking' ? 'Booking.com' : l.provider === 'google' ? 'Google Hotels' : l.provider === 'expedia' ? 'Expedia' : l.provider}
                </a>
              ))}
              {(hotelTab === 'nearest' && hotelLinksNearest.length === 0) && (
                <div className="text-sm text-slate-500">Nearest city not available for this spot.</div>
              )}
            </div>
            <div className="mt-3 text-right">
              <button className="px-4 py-2 text-slate-600 hover:text-slate-800" onClick={() => setShowHotelPicker(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
