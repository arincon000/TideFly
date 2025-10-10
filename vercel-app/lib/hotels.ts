export type HotelLink = { provider: string; url: string };

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T00:00:00Z');
  const b = new Date(checkOut + 'T00:00:00Z');
  const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

/** Build public hotel provider links (no affiliate required) */
export function generateHotelProviderUrls(params: {
  city: string;
  country?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults?: number;
}): HotelLink[] {
  const { city, country, checkIn, checkOut } = params;
  const qCity = country ? `${city}, ${country}` : city;
  const encCity = encodeURIComponent(qCity);
  const encCityOnly = encodeURIComponent(city);
  const encCheckIn = encodeURIComponent(checkIn);
  const encCheckOut = encodeURIComponent(checkOut);
  const los = nightsBetween(checkIn, checkOut);

  const links: HotelLink[] = [];

  // Booking.com (public search)
  links.push({
    provider: 'booking',
    url: `https://www.booking.com/searchresults.html?ss=${encCity}&checkin=${encCheckIn}&checkout=${encCheckOut}&group_adults=2&no_rooms=1&group_children=0`,
  });

  // Google Hotels
  links.push({
    provider: 'google',
    url: `https://www.google.com/travel/hotels/${encCityOnly}?checkin=${encCheckIn}&checkout=${encCheckOut}`,
  });

  // Expedia (destination + start/end)
  links.push({
    provider: 'expedia',
    url: `https://www.expedia.com/Hotel-Search?destination=${encCity}&startDate=${encCheckIn}&endDate=${encCheckOut}`,
  });

  return links;
}


