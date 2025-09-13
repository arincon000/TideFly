"use client";

import { supabase } from "@/lib/supabaseClient";
import { StatusPill } from "@/components/StatusPill";
import { useTier } from "@/lib/tier/useTier";
import { useAlertUsage } from "@/lib/alerts/useAlertUsage";
import { useRouter } from 'next/navigation';
import { buildAviasalesLink, buildHotellookLink } from "@/lib/affiliates";

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
  // Date fields
  depart_date?: string | null;
  return_date?: string | null;
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
};

export function AlertRow({ rule, status, refresh }: { rule: AlertRule; status?: RuleStatus; refresh: () => void }) {
  const { tier } = useTier();
  const { active, activeMax, atActiveCap } = useAlertUsage(tier);
  const router = useRouter();

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
    if (rule.paused_until) {
      const untilDate = new Date(rule.paused_until).toLocaleDateString();
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
          ⏰ Snoozed until {untilDate}
        </span>
      );
    }
    if (status?.status === 'sent') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
          Hit sent
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

  // UI must match email: default to worker-snapped window
  const departYMD = status?.snapped_depart_date ?? rule.depart_date ?? undefined;
  const returnYMD = status?.snapped_return_date ?? rule.return_date ?? undefined;
  const destIata = rule.dest_iata ?? rule.destination_iata;

  const buildFlightUrl = () => {
    if (!rule.origin_iata || !destIata || !departYMD) {
      return null;
    }
    
    // Flight link: use affiliate builder so dates are DDMM and marker/sub_id are added
    return buildAviasalesLink({
      origin: rule.origin_iata,
      dest: destIata,
      departYMD: departYMD,           // 'YYYY-MM-DD' → builder converts to DDMM
      returnYMD: returnYMD ?? undefined,
      subId: `alert_${rule.id}`,
    });
  };

  const buildHotelUrl = () => {
    if (!returnYMD || !destIata) {
      return null;
    }
    const checkout = new Date(new Date(`${returnYMD}T00:00:00Z`).getTime() + 86400000)
      .toISOString()
      .slice(0, 10);
    return buildHotellookLink({
      dest: destIata,
      checkinYMD: departYMD!,
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

  const flightUrl = buildFlightUrl();
  const hotelUrl = buildHotelUrl();

  // Helper to check if we should show spot row
  const shouldShowSpot = rule.spot_name && rule.spot_name !== '—';
  
  // Helper to check if we should show surfable dates row
  const shouldShowSurfableDates = getSurfableDates() !== '—';

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
        {status?.price && (
          <div className="text-lg font-semibold text-slate-700 ml-2" style={{ fontSize: '18px' }}>
            €{status.price.toFixed(2)}
              </div>
            )}
          </div>

      {/* Links row - Chips */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {flightUrl ? (
          <a
            href={flightUrl}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            style={{ fontSize: '15px' }}
          >
            ✈️ Flight: {rule.origin_iata} → {destIata}
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
        
        {hotelUrl ? (
          <a
            href={hotelUrl}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            style={{ fontSize: '15px' }}
          >
            🏨 Hotel: your stay in {destIata}
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

      {/* Details grid - Auto-fill */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {detailItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-slate-400" aria-hidden style={{ fontSize: '15px' }}>
              {item.emoji}
            </span>
            <span 
              className="text-slate-600 truncate" 
              title={item.title}
              style={{ fontSize: '15px' }}
            >
              <span className="text-slate-500">{item.label}:</span>{' '}
              <span className="text-slate-700 font-medium">{item.value}</span>
            </span>
          </div>
        ))}
          </div>
          
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
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-500 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          style={{ fontSize: '15px' }}
        >
          <span className="text-slate-400" aria-hidden>🗑️</span>
          Delete
        </button>
      </div>
    </div>
  );
}
