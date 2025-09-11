"use client";

import { supabase } from "@/lib/supabaseClient";
import { StatusPill } from "@/components/StatusPill";
import { useTier } from "@/lib/tier/useTier";
import { useAlertUsage } from "@/lib/alerts/useAlertUsage";
import { useRouter } from 'next/navigation';

export type AlertRule = {
  id: string;
  name: string | null;
  spot_id: string | null;
  origin_iata: string | null;
  dest_iata: string | null;
  is_active: boolean | null;
  paused_until: string | null;
  forecast_window: number | null;
  max_price_eur?: number | null;
};

export type RuleStatus = {
  rule_id: string;
  status: string | null;
  price: number | null;
  ok_dates_count: number | null;
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

  const relTime = (d: string) => {
    const date = new Date(d);
    const diff = (Date.now() - date.getTime()) / 1000;
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const steps = [
      { sec: 86400, unit: "day" },
      { sec: 3600, unit: "hour" },
      { sec: 60, unit: "minute" },
      { sec: 1, unit: "second" },
    ] as const;
    for (const s of steps) {
      const v = Math.floor(diff / s.sec);
      if (Math.abs(v) >= 1) return rtf.format(-v, s.unit);
    }
    return "just now";
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        {/* Left side - Alert details */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-bold text-slate-900">{rule.name ?? "Surf Alert"}</h3>
            <StatusPill status={status?.status ?? undefined} />
          </div>
          
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-slate-400" aria-hidden>📍</span>
              <span>{rule.origin_iata} → {rule.dest_iata}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400" aria-hidden>🌊</span>
              <span>spot #{rule.spot_id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400" aria-hidden>⏰</span>
              <span>window {rule.forecast_window ?? 5}d</span>
            </div>
            {status?.sent_at && (
              <div className="text-xs text-slate-500">
                Last checked: {relTime(status.sent_at)}
              </div>
            )}
          </div>

          {rule.paused_until && (
            <div className="mt-3 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Snoozed until {new Date(rule.paused_until).toLocaleString()}
            </div>
          )}
        </div>

        {/* Right side - Value and actions */}
        <div className="flex flex-col items-end gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">
              €{(status?.price ?? 0).toFixed(2)}
            </div>
            <div className="text-sm text-slate-500">
              OK: {status?.ok_dates_count ?? 0}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={toggleActive}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              <span className="text-slate-400" aria-hidden>⏸</span>
              {rule.is_active ? "Pause" : "Resume"}
            </button>
            <button
              onClick={snooze7}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              <span className="text-slate-400" aria-hidden>🔄</span>
              Snooze 7d
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
            >
              <span className="text-red-400" aria-hidden>🗑️</span>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
