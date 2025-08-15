"use client";

import { useEffect, useState } from "react";
import { supabase } from "~/lib/supabase-browser";
import { AlertRow, type AlertRule } from "~/components/AlertRow";

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setRules([]); return; }
    const { data } = await supabase
      .from("alert_rules")
      .select("id,name,spot_id,origin_iata,dest_iata,is_active,paused_until,forecast_window")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setRules(data ?? []);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      load();
    });
  }, []);

  if (!email) {
    return <p><a href="/">Sign in</a> to view alerts.</p>;
  }
  if (rules === null) return <p>Loading…</p>;

  return (
    <>
      <h2>Your alerts</h2>
      <p style={{ marginTop: -10 }}><a href="/alerts/new">+ New alert</a></p>
      {rules.length === 0 && <p>No alerts yet.</p>}
      {rules.map((r) => <AlertRow key={r.id} rule={r} refresh={load} />)}
    </>
  );
}
