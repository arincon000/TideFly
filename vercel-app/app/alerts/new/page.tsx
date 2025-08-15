"use client";

import { useEffect, useState } from "react";
import { supabase } from "~/lib/supabase-browser";
import { WEEKENDS } from "~/lib/days";

type Spot = { id: string; name: string };

export default function NewAlert() {
  const [userId, setUserId] = useState<string | null>(null);
  const [home, setHome] = useState<string>("");
  const [spots, setSpots] = useState<Spot[]>([]);

  // form state
  const [name, setName] = useState("Surf Alert");
  const [spotId, setSpotId] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");
  const [dest, setDest] = useState<string>("");
  const [forecastWindow, setForecastWindow] = useState<number>(5);
  const [minWave, setMinWave] = useState<number>(0.8);
  const [maxWind, setMaxWind] = useState<number>(25);
  const [minN, setMinN] = useState<number>(2);
  const [maxN, setMaxN] = useState<number>(5);
  const [daysMask, setDaysMask] = useState<number>(127); // all days

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: urow } = await supabase.from("users")
          .select("home_airport").eq("id", uid).maybeSingle();
        const homeIata = (urow?.home_airport ?? "").toUpperCase();
        setHome(homeIata);
        setOrigin(homeIata);
      }

      // optional: load spots for a select input
      const { data: s } = await supabase.from("spots").select("id,name").limit(200);
      setSpots(s ?? []);
    })();
  }, []);

  const weekendsOnly = () => setDaysMask(WEEKENDS); // 0b1100000 = 96

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return alert("Please sign in");

    const row = {
      user_id: userId,
      name,
      mode: "spot",
      spot_id: spotId || null,
      origin_iata: origin.toUpperCase() || home,
      dest_iata: (dest || "").toUpperCase(),
      forecast_window: forecastWindow,
      min_wave_m: minWave,
      max_wind_kmh: maxWind,
      min_nights: minN,
      max_nights: Math.max(minN, maxN),
      days_mask: daysMask,
      is_active: true
    };

    const { error } = await supabase.from("alert_rules").insert(row);
    if (error) return alert(error.message);
    window.location.href = "/alerts";
  };

  return (
    <>
      <h2>New alert</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
        <label> Name
          <input value={name} onChange={e => setName(e.target.value)} required />
        </label>

        <label> Spot
          <select value={spotId} onChange={e => setSpotId(e.target.value)}>
            <option value="">-- select --</option>
            {spots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label> Origin (IATA)
            <input value={origin} onChange={e => setOrigin(e.target.value.toUpperCase())} placeholder={home || "e.g. LIS"} />
          </label>
          <label> Destination (IATA)
            <input value={dest} onChange={e => setDest(e.target.value.toUpperCase())} placeholder="auto from spot" />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label> Forecast window (days)
            <input type="number" min={1} max={10} value={forecastWindow} onChange={e => setForecastWindow(+e.target.value)} />
          </label>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Days mask</div>
            <button type="button" onClick={() => setDaysMask(127)}>All days</button>{" "}
            <button type="button" onClick={weekendsOnly}>Weekends only</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label> Min wave (m)
            <input type="number" step="0.1" value={minWave} onChange={e => setMinWave(+e.target.value)} />
          </label>
          <label> Max wind (km/h)
            <input type="number" value={maxWind} onChange={e => setMaxWind(+e.target.value)} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label> Min nights
            <input type="number" min={1} value={minN} onChange={e => setMinN(+e.target.value)} />
          </label>
          <label> Max nights
            <input type="number" min={minN} value={maxN} onChange={e => setMaxN(+e.target.value)} />
          </label>
        </div>

        <button type="submit">Create alert</button>
      </form>
    </>
  );
}
