"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AlertRow, type AlertRule, type RuleStatus } from "@/components/AlertRow";
import UsageBanner from "@/components/alerts/UsageBanner";

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[] | null>(null);
  const [statusByRule, setStatusByRule] = useState<Record<string, RuleStatus>>({});

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setRules([]); return; }
    const { data: rdata } = await supabase
      .from("alert_rules")
      .select(`
        id,name,spot_id,origin_iata,dest_iata,destination_iata,is_active,paused_until,forecast_window,max_price_eur,
        wave_min_m,wave_max_m,wind_max_kmh,planning_logic,depart_date,return_date,created_at,last_checked_at,
        spots(name,country,iata_city_name,nearest_city)
      `)
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    console.log('Raw alert rules data:', rdata);
    const rules = (rdata ?? []).map(rule => {
      console.log('Processing rule:', rule.id, 'spots:', rule.spots);
      const spot = Array.isArray(rule.spots) ? rule.spots[0] : rule.spots;
      return {
        ...rule,
        spot_name: spot?.name || null,
        spot_country: spot?.country || null,
        iata_city_name: spot?.iata_city_name || null,
        nearest_city: spot?.nearest_city || null,
        spots: undefined // Remove the nested object
      } as any;
    });
    setRules(rules);

    const ids = rules.map(r => r.id);
    if (ids.length > 0) {
      // Get the latest status for each rule directly from alert_events
      console.log('🔄 [ALERTS PAGE] Fetching status for rule IDs:', ids, 'at', new Date().toISOString());
      const { data: sdata, error: statusError } = await supabase
        .from('alert_events')
        .select('rule_id, status, price, ok_dates_count, ok_dates, snapped_depart_date, snapped_return_date, sent_at, tier, reason')
        .in('rule_id', ids)
        .order('sent_at', { ascending: false });
      
      if (statusError) {
        console.error('Error fetching alert events:', statusError);
      } else {
        console.log('Alert events data:', sdata);
      }
      
      // Find the most recent worker run timestamp
      const mostRecentRun = sdata && sdata.length > 0 ? sdata[0].sent_at : null;
      console.log('Most recent worker run:', mostRecentRun);
      
      // Group by rule_id and take the most recent event for each rule (from all events)
      const statusMap: Record<string, any> = {};
      for (const event of sdata || []) {
        if (!statusMap[event.rule_id]) {
          statusMap[event.rule_id] = event;
        }
      }
      console.log('Status map (most recent event per rule):', statusMap);
      
      // Convert to the expected format
      const map: Record<string, RuleStatus> = {};
      for (const [ruleId, event] of Object.entries(statusMap)) {
        map[ruleId] = {
          rule_id: event.rule_id,
          status: event.status,
          price: event.price,
          ok_dates_count: event.ok_dates_count,
          ok_dates: event.ok_dates,
          snapped_depart_date: event.snapped_depart_date,
          snapped_return_date: event.snapped_return_date,
          first_ok: event.ok_dates?.[0] || null,
          last_ok: event.ok_dates?.[event.ok_dates.length - 1] || null,
          ok_count: event.ok_dates?.length || 0,
          sent_at: event.sent_at,
          reason: event.reason,
        };
      }
      
      // Add "No data" status for rules that have never been processed
      for (const ruleId of ids) {
        if (!map[ruleId]) {
          map[ruleId] = {
            rule_id: ruleId,
            status: null, // This will show as "No data" in the UI
            price: null,
            ok_dates_count: null,
            ok_dates: null,
            snapped_depart_date: null,
            snapped_return_date: null,
            first_ok: null,
            last_ok: null,
            ok_count: 0,
            sent_at: null,
          };
        }
      }
      
      console.log('Final status map for UI:', map);
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
            href="/feedback"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <span className="text-lg" aria-hidden>💬</span>
            Feedback
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

      {/* Usage Banner */}
      <UsageBanner />

      {/* Alerts List */}
      <div className="space-y-6">
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
