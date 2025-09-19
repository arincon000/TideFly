"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { StatusPill } from "@/components/StatusPill";
import { useTier } from "@/lib/tier/useTier";
import { useAlertUsage } from "@/lib/alerts/useAlertUsage";
import { useRouter } from 'next/navigation';
import { buildAviasalesLink, buildHotellookLink } from "@/lib/affiliates";
import { generateAffiliateUrls } from "@/lib/dateUtils";
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
  
  const { tier } = useTier();
  const { active, activeMax, atActiveCap } = useAlertUsage(tier);
  const router = useRouter();
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [forecastData, setForecastData] = useState<any[]>([]);

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

  const toggleActive = async () => {
    // If trying to resume (activate) and at active cap, show error
    if (!rule.is_active && atActiveCap) {
      alert(`You're at your active limit (${active}/${activeMax}) for ${tier}. Pause/delete another alert, or upgrade to Pro.`);
      return;
    }
    
    await supabase.from("alert_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);
    refresh();
  };

  const snooze7 = async () => {
    const until = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await supabase.from("alert_rules")
      .update({ paused_until: until })
      .eq("id", rule.id);
    refresh();
  };

  const onDelete = async () => {
    if (!confirm('Delete this alert?')) return;
    const { error } = await supabase.from('alert_rules').delete().eq('id', rule.id);
    if (error) {
      console.error(error);
      return;
    }
    router.refresh();
    refresh();
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

  const buildHotelUrl = () => {
    if (!destIata) {
      return null;
    }
    
    // PRIORITY 1: Use fresh forecast data if available (same as Forecast Details Modal)
    if (forecastData && forecastData.length > 0) {
      try {
        // Extract good days from fresh forecast data
        const goodDays = forecastData
          .filter(day => day.overallOk)
          .map(day => day.date);
        
        if (goodDays.length > 0) {
          const { hotelUrl } = generateAffiliateUrls(
            goodDays,
            rule.origin_iata || 'LIS', // Fallback origin
            destIata,
            '670448', // Hardcoded affiliate ID for client-side
            `alert_${rule.id}`
          );
          return hotelUrl;
        }
      } catch (error) {
        console.error('Error generating unified affiliate URLs from fresh data:', error);
        // Fall back to old logic
      }
    }
    
    // PRIORITY 2: Use unified date logic if we have good days from status (cached data)
    if (status?.ok_dates && status.ok_dates.length > 0) {
      try {
        const { hotelUrl } = generateAffiliateUrls(
          status.ok_dates,
          rule.origin_iata || 'LIS', // Fallback origin
          destIata,
          '670448', // Hardcoded affiliate ID for client-side
          `alert_${rule.id}`
        );
        return hotelUrl;
      } catch (error) {
        console.error('Error generating unified affiliate URLs from cached data:', error);
        // Fall back to old logic
      }
    }
    
    // PRIORITY 3: Fallback to old logic for alerts without good days
    const departYMD = status?.snapped_depart_date ?? rule.depart_date ?? undefined;
    const returnYMD = status?.snapped_return_date ?? rule.return_date ?? undefined;
    
    if (!returnYMD || !departYMD) {
      return null;
    }
    
    const checkout = new Date(new Date(`${returnYMD}T00:00:00Z`).getTime() + 86400000)
      .toISOString()
      .slice(0, 10);
    return buildHotellookLink({
      dest: destIata,
      checkinYMD: departYMD,
      checkoutYMD: checkout,
      subId: `alert_${rule.id}`,
    });
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
  const hotelUrl = buildHotelUrl();

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
            {' '}Current price is €{status.price?.toFixed(2)} but your alert has a maximum price limit.
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" style={{ lineHeight: '1.4' }}>
      {/* Top row - Essentials */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 truncate" style={{ fontSize: '18px' }}>
            {rule.name ?? "Surf Alert"}
          </h3>
          {getStatusBadge()}
        </div>
        {status?.price && !isNewAlert(rule) && (
          <div className="text-lg font-semibold text-slate-700 ml-2" style={{ fontSize: '18px' }}>
            €{status.price.toFixed(2)}
              </div>
            )}
          </div>

      {/* Links row - Chips */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Show booking chips for new alerts with good conditions (revenue optimization) */}
        {(flightUrl || (isNewAlert(rule) && hasGoodConditions(forecastData))) ? (
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
            title="Set dates to enable flight link"
            style={{ fontSize: '15px' }}
          >
            ✈️ Flight: {rule.origin_iata} → {destIata}
            </div>
          )}
        
        {/* Show hotel chips for new alerts with good conditions (revenue optimization) */}
        {(hotelUrl || (isNewAlert(rule) && hasGoodConditions(forecastData))) ? (
          <a
            href={hotelUrl || '#'}
            target="_blank"
            rel="nofollow sponsored noopener"
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              isNewAlert(rule) && hasGoodConditions(forecastData) && !hotelUrl
                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            style={{ fontSize: '15px' }}
            title={isNewAlert(rule) && hasGoodConditions(forecastData) && !hotelUrl ? 'Price not yet verified - will be checked in next run' : undefined}
          >
            🏨 Hotel: your stay in {destIata}
            {isNewAlert(rule) && hasGoodConditions(forecastData) && !hotelUrl && ' *'}
          </a>
        ) : (
          <div
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-gray-500 cursor-not-allowed"
            title={status?.snapped_depart_date ? "Need both start & end to build hotel link" : "No surfable days yet"}
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
          const isClickable = item.label === 'Wave' || item.label === 'Wind';
          
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
              onClick={snooze7}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          style={{ fontSize: '15px' }}
            >
          <span className="text-slate-400" aria-hidden>🛌</span>
              Snooze 7d
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
          onClick={onDelete}
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
          planning_logic: rule.planning_logic
        }}
      />
    </div>
  );
}
