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

  if (rules === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your alerts</h1>
          <p className="mt-2 text-lg text-slate-600">
            Monitor and manage your surf condition alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <span className="text-lg" aria-hidden>📍</span>
            Explore Spots
          </a>
          <a
            href="/suggestions"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <span className="text-lg" aria-hidden>💡</span>
            Suggestions
          </a>
          <a
            href="/alerts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <span className="text-lg" aria-hidden>+</span>
            New alert
          </a>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-sky-100 grid place-items-center">
              <span className="text-2xl" aria-hidden>🌊</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No alerts yet</h3>
            <p className="text-slate-600 mb-6">Create your first surf alert to start tracking perfect waves</p>
            <a
              href="/alerts/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white font-semibold hover:bg-blue-700 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              <span aria-hidden>+</span>
              Create your first alert
            </a>
          </div>
        ) : (
          rules.map((r) => <AlertRow key={r.id} rule={r} status={statusByRule[r.id]} refresh={load} />)
        )}
      </div>
    </div>
  );
}
