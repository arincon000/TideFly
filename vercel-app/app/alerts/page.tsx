"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { AlertRow, type AlertRule, type RuleStatus } from "@/components/AlertRow";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHeader, TableRow, TableHead } from "@/components/ui/table";

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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your alerts</h2>
        <Button asChild>
          <Link href="/alerts/new">+ New alert</Link>
        </Button>
      </div>
      {rules.length === 0 ? (
        <p>No alerts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert</TableHead>
              <TableHead className="w-[1%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r) => (
              <AlertRow key={r.id} rule={r} status={statusByRule[r.id]} refresh={load} />
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
