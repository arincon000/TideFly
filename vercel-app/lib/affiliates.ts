function ddmm(ymd: string) {
  const [_, m, d] = ymd.split("-");
  if (!d || !m) return "";
  return `${d}${m}`;
}

/** Aviasales deep link (one-way or round-trip) */
export function buildAviasalesLink(opts: {
  origin: string; dest: string; departYMD: string; returnYMD?: string; subId?: string;
}): string | null {
  if (!opts.origin || !opts.dest || !opts.departYMD) return null;

  const toDDMM = (ymd?: string) =>
    ymd ? `${ymd.slice(8, 10)}${ymd.slice(5, 7)}` : undefined;
  const origin = opts.origin.toUpperCase();
  const dest = opts.dest.toUpperCase();
  const dep = toDDMM(opts.departYMD)!;
  const ret = toDDMM(opts.returnYMD);

  const base = "https://www.aviasales.com/search";
  const path = `${origin}${dep}${dest}${ret ?? ""}`;

  // Use marker/sub_id if present, but NEVER gate the URL on them
  const marker =
    process.env.NEXT_PUBLIC_AVIA_AFFILIATE_ID ||
    process.env.AVIA_AFFILIATE_ID ||
    "";
  const qs = new URLSearchParams();
  if (marker) qs.set("marker", marker);
  if (opts.subId) qs.set("sub_id", opts.subId);
  const query = qs.toString();
  return `${base}/${path}${query ? `?${query}` : ""}`;
}

/** Booking.com via TP redirector */
export function buildBookingLink(opts: {
  city: string; checkinYMD: string; checkoutYMD: string; subId?: string;
}): string | null {
  if (process.env.ENABLE_AFFILIATES !== "true" || process.env.ENABLE_HOTEL_CTA !== "true") return null;
  const marker = process.env.AVIA_AFFILIATE_ID?.trim();
  if (!marker || !opts.city || !opts.checkinYMD || !opts.checkoutYMD) return null;

  const booking = new URL("https://www.booking.com/searchresults.en.html");
  booking.searchParams.set("ss", opts.city);
  booking.searchParams.set("checkin", opts.checkinYMD);
  booking.searchParams.set("checkout", opts.checkoutYMD);
  booking.searchParams.set("group_adults", "2");
  booking.searchParams.set("no_rooms", "1");
  booking.searchParams.set("group_children", "0");

  const tp = new URL("https://tp.media/r");
  tp.searchParams.set("marker", marker);
  tp.searchParams.set("p", "booking");
  tp.searchParams.set("u", booking.toString());
  if (opts.subId) tp.searchParams.set("sub_id", opts.subId);
  return tp.toString();
}

/** Hotellook via TP redirector (city + dates) */
export function buildHotellookLink(opts: {
  dest: string; checkinYMD: string; checkoutYMD: string; subId?: string;
}): string | null {
  if (!opts.dest || !opts.checkinYMD || !opts.checkoutYMD) return null;

  // tp.media affiliate – but still return a working link even if marker missing
  const dest = opts.dest.toUpperCase();
  const marker =
    process.env.NEXT_PUBLIC_AVIA_AFFILIATE_ID ||
    process.env.AVIA_AFFILIATE_ID ||
    ""; // many setups reuse same marker
  const p = process.env.NEXT_PUBLIC_TP_P_HOTELLOOK || process.env.TP_P_HOTELLOOK || "";

  // Fallback to direct Hotellook link if no marker/p set (still usable)
  if (!marker || !p) {
    const u = new URL("https://search.hotellook.com/");
    u.searchParams.set("destination", dest);
    u.searchParams.set("checkin", opts.checkinYMD);
    u.searchParams.set("checkout", opts.checkoutYMD);
    u.searchParams.set("locale", "en_US");
    return u.toString();
  }
  const u = new URL("https://tp.media/r");
  u.searchParams.set("marker", marker);
  u.searchParams.set("p", p);
  u.searchParams.set(
    "u",
    encodeURI(
      `https://search.hotellook.com/?destination=${dest}&checkIn=${opts.checkinYMD}&checkOut=${opts.checkoutYMD}&adults=1&rooms=1&children=0&locale=en&currency=USD`,
    ),
  );
  if (opts.subId) u.searchParams.set("sub_id", opts.subId);
  return u.toString();
}

export type HotelProvider = "hotellook" | "booking";

/** Provider-agnostic hotel link (default from env) */
export function buildHotelLink(opts: {
  dest: string; checkinYMD: string; checkoutYMD: string; subId?: string;
}, overrideProvider?: HotelProvider): string | null {
  if (process.env.ENABLE_HOTEL_CTA !== "true") return null;
  const provider = overrideProvider ?? (process.env.HOTEL_PROVIDER as HotelProvider) ?? "hotellook";
  return provider === "booking" ? buildBookingLink({...opts, city: opts.dest}) : buildHotellookLink(opts);
}
