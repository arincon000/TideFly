export function StatusPill({ status }: { status?: string }) {
  const map = {
    sent: { label: 'Hit sent', cls: 'bg-green-100 text-green-800' },
    too_pricey: { label: 'Too pricey', cls: 'bg-amber-100 text-amber-800' },
    no_surf: { label: 'No surf', cls: 'bg-gray-100 text-gray-700' },
    forecast_unavailable: { label: 'Forecast issue', cls: 'bg-red-100 text-red-800' },
  } as const;
  const m = status ? map[status as keyof typeof map] : undefined;
  const label = m?.label ?? 'No data';
  const cls = m?.cls ?? 'bg-slate-100 text-slate-700';
  return <span className={`text-xs px-2 py-1 rounded-full ${cls}`}>{label}</span>;
}
