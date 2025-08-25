"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { WEEKENDS } from "@/lib/days";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import { getUserPlan, type Plan } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Spot = { id: string; name: string; primary_airport_iata: string | null };

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
  const [originError, setOriginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [maxPrice, setMaxPrice] = useState<number>(300);

  const isIata = (v: string) => /^[A-Z]{3}$/.test(v);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setPlan(getUserPlan(session));

      if (uid) {
        const { data: urow } = await supabase.from("users")
          .select("home_airport").eq("id", uid).maybeSingle();
        const homeIata = (urow?.home_airport ?? "").toUpperCase();
        setHome(homeIata);
        setOrigin(homeIata);
      }

      // optional: load spots for a select input
      const { data: s } = await supabase
        .from("spots")
        .select("id,name,primary_airport_iata")
        .order("name", { ascending: true });
      setSpots(s ?? []);
    })();
  }, []);

  const weekendsOnly = () => setDaysMask(WEEKENDS); // 0b1100000 = 96

  function onSpotChange(id: string) {
    const s = spots.find(x => x.id === id);
    setSpotId(id);
    setDest((s?.primary_airport_iata || "").toUpperCase());
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const originIata = (origin || "").toUpperCase();
    if (!isIata(originIata)) {
      setOriginError("Please enter a valid 3-letter IATA code (e.g., BOG).");
      return;
    }
    setOriginError(null);
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const row = {
        user_id: user.id,
        name,
        mode: "spot",
        spot_id: spotId || null,
        origin_iata: originIata,
        dest_iata: (dest || "").toUpperCase().slice(0, 3),
        forecast_window: forecastWindow,
        min_wave_m: minWave,
        max_wind_kmh: maxWind,
        min_nights: minN,
        max_nights: Math.max(minN, maxN),
        days_mask: daysMask,
        is_active: true,
        max_price_eur: plan === "premium" ? maxPrice : 300
      };

      const { error } = await supabase.from("alert_rules").insert(row);
      if (error) throw error;
      window.location.href = "/alerts";
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">New alert</h2>
      <form onSubmit={submit} className="grid max-w-xl gap-4">
        <div className="grid gap-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div className="grid gap-1">
          <Label>Spot</Label>
          <Select value={spotId} onValueChange={onSpotChange}>
            <SelectTrigger>
              <SelectValue placeholder="-- select --" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">-- select --</SelectItem>
              {spots.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1">
            <Label>Origin (IATA)</Label>
            <AirportAutocomplete
              value={origin}
              onChange={iata => {
                const upper = iata.toUpperCase();
                setOrigin(upper);
                setOriginError(isIata(upper) ? null : "Please enter a valid 3-letter IATA code (e.g., BOG).");
              }}
              placeholder={home || "e.g. LIS"}
            />
            {originError && <p className="mt-1 text-sm text-destructive">{originError}</p>}
          </div>
          <div className="grid gap-1">
            <Label>Destination (IATA)</Label>
            <Input
              value={dest}
              onChange={e => setDest(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="auto from spot"
              maxLength={3}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1">
            <Label>Forecast window (days)</Label>
            <Input type="number" min={1} max={10} value={forecastWindow} onChange={e => setForecastWindow(+e.target.value)} />
          </div>
          <div>
            <div className="mb-2 text-xs text-muted-foreground">Days mask</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDaysMask(127)}>
                All days
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={weekendsOnly}>
                Weekends only
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1">
            <Label>Min wave (m)</Label>
            <Input type="number" step="0.1" value={minWave} onChange={e => setMinWave(+e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Max wind (km/h)</Label>
            <Input type="number" value={maxWind} onChange={e => setMaxWind(+e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1">
            <Label>Min nights</Label>
            <Input type="number" min={1} value={minN} onChange={e => setMinN(+e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Max nights</Label>
            <Input type="number" min={minN} value={maxN} onChange={e => setMaxN(+e.target.value)} />
          </div>
        </div>

        <div className="grid gap-1">
          <Label>Max price (€)</Label>
          <Input
            type="number"
            min={50}
            max={5000}
            step={0.01}
            value={maxPrice}
            onChange={e => setMaxPrice(+e.target.value)}
            disabled={plan !== "premium"}
          />
          {plan !== "premium" && (
            <div className="text-xs"><a href="/upgrade">Upgrade</a></div>
          )}
        </div>

        <Button type="submit" disabled={!isIata(origin) || isSubmitting}>
          {isSubmitting ? "Saving..." : "Create alert"}
        </Button>
      </form>
    </>
  );
}
