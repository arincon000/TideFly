"use client";

import { supabase } from "@/lib/supabaseClient";
import { StatusPill } from "@/components/StatusPill";

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
    <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 600 }}>{rule.name ?? "Surf Alert"}</div>
            <StatusPill status={status?.status ?? undefined} />
          </div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {rule.origin_iata} → {rule.dest_iata} &nbsp;|&nbsp; spot #{rule.spot_id} &nbsp;|&nbsp; window {rule.forecast_window ?? 5}d
          </div>
          {(() => {
            const parts: string[] = [];
            if (status?.sent_at) parts.push(`Last checked: ${relTime(status.sent_at)}`);
            if (status?.price != null) parts.push(`Price: €${status.price.toFixed(2)}`);
            if (status?.ok_dates_count != null) parts.push(`OK: ${status.ok_dates_count}`);
            return parts.length > 0 ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>{parts.join(" • ")}</div>
            ) : null;
          })()}
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
