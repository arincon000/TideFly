import { NextResponse } from "next/server";
import { buildAviasalesLink, buildHotelLink } from "@/lib/affiliates";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin  = (url.searchParams.get("orig")   || "").toUpperCase();
  const dest    = (url.searchParams.get("dest")   || "").toUpperCase();
  const depart  =  url.searchParams.get("depart") || "";
  const ret     =  url.searchParams.get("return") || "";
  const city    =  url.searchParams.get("city")   || dest;
  const sub     =  url.searchParams.get("sub")    || undefined;
  const provider = (url.searchParams.get("provider") || undefined) as any;

  const flight = buildAviasalesLink({ origin, dest, departYMD: depart, returnYMD: ret || undefined, subId: sub });
  const hotel  = buildHotelLink({ dest: city, checkinYMD: depart, checkoutYMD: ret || depart, subId: sub }, provider);

  return NextResponse.json({
    ok: true,
    flight,
    hotel,
    env: {
      ENABLE_AFFILIATES: process.env.ENABLE_AFFILIATES,
      ENABLE_HOTEL_CTA: process.env.ENABLE_HOTEL_CTA,
      HOTEL_PROVIDER: process.env.HOTEL_PROVIDER,
    },
  });
}
