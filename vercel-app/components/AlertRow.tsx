"use client";

import { supabase } from "@/lib/supabaseClient";

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
  created_at: string | null;
};

export function AlertRow({ rule, status, refresh }: { rule: AlertRule; status?: RuleStatus; refresh: () => void }) {
  const toggleActive = async () => {
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

  const statusInfo = (() => {
    switch (status?.status) {
      case "sent":
        return { text: "Hit sent", bg: "#16a34a", color: "#fff" };
      case "too_pricey":
        return { text: "Too pricey", bg: "#f59e0b", color: "#fff" };
      case "no_surf":
        return { text: "No surf", bg: "#6b7280", color: "#fff" };
      case "forecast_unavailable":
        return { text: "Forecast issue", bg: "#dc2626", color: "#fff" };
      default:
        return { text: "No data", bg: "#e5e7eb", color: "#000" };
    }
  })();

  return (
    <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 600 }}>{rule.name ?? "Surf Alert"}</div>
            <span style={{ fontSize: 12, padding: "2px 6px", borderRadius: 999, backgroundColor: statusInfo.bg, color: statusInfo.color }}>
              {statusInfo.text}
            </span>
          </div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {rule.origin_iata} → {rule.dest_iata} &nbsp;|&nbsp; spot #{rule.spot_id} &nbsp;|&nbsp; window {rule.forecast_window ?? 5}d
          </div>
          {status?.created_at && (
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Last checked: {new Date(status.created_at).toLocaleString()} • Price: €{status.price != null ? status.price.toFixed(2) : "N/A"} • OK: {status.ok_dates_count ?? 0}
            </div>
          )}
          {rule.paused_until && (
            <div style={{ fontSize: 12, color: "#a66" }}>
              Snoozed until {new Date(rule.paused_until).toLocaleString()}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggleActive}>{rule.is_active ? "Pause" : "Resume"}</button>
          <button onClick={snooze7}>Snooze 7d</button>
        </div>
      </div>
    </div>
  );
}
