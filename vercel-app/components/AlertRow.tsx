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
};

export function AlertRow({ rule, refresh }: { rule: AlertRule; refresh: () => void }) {
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

  return (
    <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 600 }}>{rule.name ?? "Surf Alert"}</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {rule.origin_iata} → {rule.dest_iata} &nbsp;|&nbsp; spot #{rule.spot_id} &nbsp;|&nbsp; window {rule.forecast_window ?? 5}d
          </div>
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
