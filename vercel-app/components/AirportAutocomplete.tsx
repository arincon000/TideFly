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
  placeholder = "e.g., BOG or Bogotá",
  className = "border p-2 w-full",
}: {
  value: string;
  onChange: (iata: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState(value);
  const [list, setList] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(query, 200);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const run = async () => {
      const q = debounced.trim();
      if (!q) {
        setList([]);
        return;
      }
      const { data } = await supabase.rpc("search_airports", { q, max_results: 8 });
      if (data) setList(data as Airport[]);
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

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && list.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-height-64 overflow-auto border bg-white text-black rounded shadow">
          {list.map((a, i) => (
            <li
              key={a.iata}
              className={`px-3 py-2 cursor-pointer ${i === active ? "bg-gray-200" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={e => {
                e.preventDefault();
                pick(a);
              }}
            >
              <div className="font-medium">{a.iata.toUpperCase()} — {a.city ?? ""}</div>
              <div className="text-sm text-gray-600">
                {a.name}
                {a.country ? `, ${a.country}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
