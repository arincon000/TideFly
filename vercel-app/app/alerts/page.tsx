"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AlertRow, type AlertRule, type RuleStatus } from "@/components/AlertRow";

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[] | null>(null);
  const [statusByRule, setStatusByRule] = useState<Record<string, RuleStatus>>({});

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setRules([]); return; }
    const { data: rdata } = await supabase
      .from("alert_rules")
      .select("id,name,spot_id,origin_iata,dest_iata,is_active,paused_until,forecast_window,max_price_eur")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    const rules = rdata ?? [];
    setRules(rules);

    const ids = rules.map(r => r.id);
    if (ids.length > 0) {
      const { data: sdata } = await supabase
        .schema('api')
        .from('v1_rule_status')
        .select('*')
        .in('rule_id', ids);
      const map: Record<string, RuleStatus> = Object.fromEntries((sdata ?? []).map(s => [s.rule_id, s]));
      setStatusByRule(map);
    } else {
      setStatusByRule({});
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (rules === null) return <p>Loading…</p>;

  return (
    <>
      <h2>Your alerts</h2>
      <p className="-mt-2"><a href="/alerts/new">+ New alert</a></p>
      {rules.length === 0 && <p>No alerts yet.</p>}
      {rules.map((r) => <AlertRow key={r.id} rule={r} status={statusByRule[r.id]} refresh={load} />)}
    </>
  );
}
