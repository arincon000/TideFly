function ddmm(ymd: string) {
  const [_, m, d] = ymd.split("-");
  if (!d || !m) return "";
  return `${d}${m}`;
}

/** Aviasales deep link (one-way or round-trip) */
export function buildAviasalesLink(opts: {
  origin: string; dest: string; departYMD: string; returnYMD?: string; subId?: string;
}): string | null {
  if (process.env.ENABLE_AFFILIATES !== "true") return null;
  const marker = process.env.AVIA_AFFILIATE_ID?.trim();
  if (!marker || !opts.origin || !opts.dest || !opts.departYMD) return null;

  const outbound = `${opts.origin.toUpperCase()}${ddmm(opts.departYMD)}${opts.dest.toUpperCase()}`;
  const rt = opts.returnYMD ? ddmm(opts.returnYMD) : "";
  let url = `https://aviasales.com/search/${outbound}${rt}?marker=${encodeURIComponent(marker)}`;
  if (opts.subId) url += `&sub_id=${encodeURIComponent(opts.subId)}`;
  return url;
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
  city: string; checkinYMD: string; checkoutYMD: string; subId?: string;
}): string | null {
  if (process.env.ENABLE_AFFILIATES !== "true" || process.env.ENABLE_HOTEL_CTA !== "true") return null;
  const marker = process.env.AVIA_AFFILIATE_ID?.trim();
  if (!marker || !opts.city || !opts.checkinYMD || !opts.checkoutYMD) return null;

  const h = new URL("https://search.hotellook.com/");
  h.searchParams.set("destination", opts.city);
  h.searchParams.set("checkIn",  opts.checkinYMD);
  h.searchParams.set("checkOut", opts.checkoutYMD);
  h.searchParams.set("adults",   "2");
  h.searchParams.set("rooms",    "1");
  h.searchParams.set("children", "0");
  h.searchParams.set("locale",   "en");
  h.searchParams.set("currency", "EUR");

  const tp = new URL("https://tp.media/r");
  tp.searchParams.set("marker", marker);
  tp.searchParams.set("p", process.env.TP_P_HOTELLOOK || "4115");
  tp.searchParams.set("u", h.toString());
  if (opts.subId) tp.searchParams.set("sub_id", opts.subId);
  return tp.toString();
}

export type HotelProvider = "hotellook" | "booking";

/** Provider-agnostic hotel link (default from env) */
export function buildHotelLink(opts: {
  city: string; checkinYMD: string; checkoutYMD: string; subId?: string;
}, overrideProvider?: HotelProvider): string | null {
  if (process.env.ENABLE_HOTEL_CTA !== "true") return null;
  const provider = overrideProvider ?? (process.env.HOTEL_PROVIDER as HotelProvider) ?? "hotellook";
  return provider === "booking" ? buildBookingLink(opts) : buildHotellookLink(opts);
}
