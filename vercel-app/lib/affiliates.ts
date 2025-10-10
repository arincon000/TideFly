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
export type HotelProvider = "booking";

/** Deprecated: buildHotelLink routed to Booking only (public provider mode handled elsewhere). */
export function buildHotelLink(opts: {
  dest: string; checkinYMD: string; checkoutYMD: string; subId?: string;
}, _overrideProvider?: HotelProvider): string | null {
  if (process.env.ENABLE_HOTEL_CTA !== "true") return null;
  return buildBookingLink({ city: opts.dest, checkinYMD: opts.checkinYMD, checkoutYMD: opts.checkoutYMD, subId: opts.subId });
}
