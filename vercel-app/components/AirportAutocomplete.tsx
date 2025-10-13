"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Airport = { iata: string; name: string; city: string | null; country: string | null };

function useDebouncedValue<T>(v: T, ms = 200) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export default function AirportAutocomplete({
  value,
  onChange,
  onInputChange,
  placeholder = "e.g., BOG or Bogotá",
  className = "border p-2 w-full",
}: {
  value: string;
  onChange: (iata: string) => void;
  onInputChange?: (q: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState(value);
  const [list, setList] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(query, 200);
  const boxRef = useRef<HTMLDivElement>(null);

  // Lightweight local fallback so the landing demo works even if Supabase is unavailable
  const fallbackAirports: Airport[] = [
    { iata: "LAX", name: "Los Angeles Intl", city: "Los Angeles", country: "US" },
    { iata: "MAD", name: "Adolfo Suárez Madrid–Barajas", city: "Madrid", country: "ES" },
    { iata: "LIS", name: "Humberto Delgado", city: "Lisbon", country: "PT" },
    { iata: "BRU", name: "Zaventem", city: "Brussels", country: "BE" },
    { iata: "DUB", name: "Dublin", city: "Dublin", country: "IE" },
    { iata: "JFK", name: "John F. Kennedy Intl", city: "New York", country: "US" },
    { iata: "SFO", name: "San Francisco Intl", city: "San Francisco", country: "US" },
    { iata: "LHR", name: "Heathrow", city: "London", country: "GB" },
    { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR" },
    { iata: "BCN", name: "El Prat", city: "Barcelona", country: "ES" },
    { iata: "AMS", name: "Schiphol", city: "Amsterdam", country: "NL" },
    { iata: "FRA", name: "Frankfurt Main", city: "Frankfurt", country: "DE" },
  ];

  useEffect(() => {
    const run = async () => {
      const q = debounced.trim();
      if (!q) {
        setList([]);
        return;
      }
      try {
        const { data, error } = await supabase.rpc("search_airports", { q, max_results: 8 });
        if (!error && data) {
          setList(data as Airport[]);
          return;
        }
      } catch (_e) {
        // ignore and fall back
      }
      // Fallback: simple client-side filter
      const qlow = q.toLowerCase();
      const filtered = fallbackAirports.filter(a =>
        a.iata.toLowerCase().includes(qlow) ||
        (a.city ?? '').toLowerCase().includes(qlow) ||
        (a.name ?? '').toLowerCase().includes(qlow) ||
        (a.country ?? '').toLowerCase().includes(qlow)
      ).slice(0, 8);
      setList(filtered);
    };
    run();
  }, [debounced]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  function pick(a: Airport) {
    onChange(a.iata.toUpperCase());
    setQuery(`${a.iata.toUpperCase()} — ${a.city ?? ""} ${a.name ? `(${a.name})` : ""}`.trim());
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || list.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(i => (i + 1) % list.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(i => (i - 1 + list.length) % list.length);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      pick(list[active]);
    }
  }

  useEffect(() => {
    if (/^[A-Za-z]{3}$/.test(value)) setQuery(value.toUpperCase());
  }, [value]);

  // Do not uppercase/emit while typing; only emit on explicit selection

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          onInputChange?.(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && list.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-auto border bg-white text-slate-900 rounded-lg shadow">
          {list.map((a, i) => (
            <li
              key={a.iata}
              className={`px-3 py-2 cursor-pointer ${i === active ? "bg-blue-50" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={e => {
                e.preventDefault();
                pick(a);
              }}
            >
              <div className="font-medium">{a.iata.toUpperCase()} — {a.city ?? ""}</div>
              <div className="text-sm text-slate-600">
                {a.name}
                {a.country ? `, ${a.country}` : ""}
              </div>
            </li>
          ))}
          {/* hint */}
          {list[active] && (
            <li className="px-3 py-2 text-xs text-slate-500 border-t">Press Enter to select {list[active].iata.toUpperCase()}</li>
          )}
        </ul>
      )}
    </div>
  );
}
