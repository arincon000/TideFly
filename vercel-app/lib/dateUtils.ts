/**
 * Unified date range calculation for affiliate links
 * Ensures consistent trip duration logic across all systems
 */

export interface TripDates {
  departDate: string; // YYYY-MM-DD format
  returnDate: string; // YYYY-MM-DD format
  tripDuration: number; // Number of days
}

/**
 * Calculate optimal trip dates based on good surf days
 * 
 * Logic:
 * - If 1 good day → 3-day minimum trip
 * - If 2+ good days → good days + 1 day
 * 
 * @param goodDays Array of good surf days in YYYY-MM-DD format
 * @param minDays Minimum trip duration (default: 3)
 * @returns TripDates object with depart/return dates and duration
 */
export function calculateTripDates(goodDays: string[], minDays: number = 3): TripDates {
  if (!goodDays || goodDays.length === 0) {
    throw new Error('No good days provided for trip calculation');
  }

  // Sort dates to ensure proper order
  const sortedDays = [...goodDays].sort();
  const firstGoodDay = sortedDays[0];
  const lastGoodDay = sortedDays[sortedDays.length - 1];

  // Calculate return date based on logic
  let returnDate: Date;
  if (goodDays.length === 1) {
    // Single good day → minimum trip duration from departure
    const departDate = new Date(firstGoodDay);
    returnDate = new Date(departDate);
    returnDate.setDate(departDate.getDate() + minDays);
  } else {
    // Multiple good days → last good day + 1 day
    const lastGoodDate = new Date(lastGoodDay);
    returnDate = new Date(lastGoodDate);
    returnDate.setDate(lastGoodDate.getDate() + 1);
  }

  // Calculate trip duration
  const departDate = new Date(firstGoodDay);
  const tripDuration = Math.ceil((returnDate.getTime() - departDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    departDate: firstGoodDay,
    returnDate: returnDate.toISOString().split('T')[0], // YYYY-MM-DD format
    tripDuration
  };
}

/**
 * Format date for Aviasales URL (DDMM format)
 * @param dateString Date in YYYY-MM-DD format
 * @returns Date in DDMM format
 */
export function formatDateForAviasales(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}${month}`;
}

/**
 * Format date for Hotellook URL (YYYY-MM-DD format)
 * @param dateString Date in YYYY-MM-DD format
 * @returns Date in YYYY-MM-DD format (already correct)
 */
export function formatDateForHotellook(dateString: string): string {
  return dateString; // Already in correct format
}

/**
 * Generate Aviasales affiliate URL
 * @param origin Origin airport code (e.g., 'LIS')
 * @param destination Destination airport code (e.g., 'BIQ')
 * @param departDate Departure date in YYYY-MM-DD format
 * @param returnDate Return date in YYYY-MM-DD format
 * @param marker Affiliate marker
 * @param subId Sub ID for tracking
 * @returns Complete Aviasales affiliate URL
 */
export function generateAviasalesUrl(
  origin: string,
  destination: string,
  departDate: string,
  returnDate: string,
  marker: string,
  subId: string
): string {
  const departFormatted = formatDateForAviasales(departDate);
  const returnFormatted = formatDateForAviasales(returnDate);
  
  return `https://aviasales.com/search/${origin}${departFormatted}${destination}${returnFormatted}?marker=${marker}&sub_id=${subId}`;
}

/**
 * Generate Hotellook affiliate URL
 * @param destination Destination airport code (e.g., 'BIQ')
 * @param checkIn Check-in date in YYYY-MM-DD format
 * @param checkOut Check-out date in YYYY-MM-DD format
 * @param marker Affiliate marker
 * @param subId Sub ID for tracking
 * @returns Complete Hotellook affiliate URL
 */
export function generateHotellookUrl(
  destination: string,
  checkIn: string,
  checkOut: string,
  marker: string,
  subId: string
): string {
  const checkInFormatted = formatDateForHotellook(checkIn);
  const checkOutFormatted = formatDateForHotellook(checkOut);
  
  return `https://search.hotellook.com/?destination=${destination}&checkIn=${checkInFormatted}&checkOut=${checkOutFormatted}&adults=1&rooms=1&children=0&locale=en&currency=USD&marker=${marker}&sub_id=${subId}`;
}

/**
 * Generate both flight and hotel affiliate URLs using unified date logic
 * @param goodDays Array of good surf days
 * @param origin Origin airport code
 * @param destination Destination airport code
 * @param marker Affiliate marker
 * @param subId Sub ID for tracking
 * @returns Object with flight and hotel URLs
 */
export function generateAffiliateUrls(
  goodDays: string[],
  origin: string,
  destination: string,
  marker: string,
  subId: string
): { flightUrl: string; hotelUrl: string; tripDates: TripDates } {
  const tripDates = calculateTripDates(goodDays);
  
  const flightUrl = generateAviasalesUrl(
    origin,
    destination,
    tripDates.departDate,
    tripDates.returnDate,
    marker,
    subId
  );
  
  const hotelUrl = generateHotellookUrl(
    destination,
    tripDates.departDate,
    tripDates.returnDate,
    marker,
    subId
  );
  
  return {
    flightUrl,
    hotelUrl,
    tripDates
  };
}
