"""
Unified date range calculation for affiliate links
Ensures consistent trip duration logic across all systems
"""

from typing import List, Tuple, Optional
from datetime import datetime, timedelta


def calculate_trip_dates(good_days: List[str], min_days: int = 3) -> Tuple[str, str, int]:
    """
    Calculate optimal trip dates based on good surf days
    
    Logic:
    - If 1 good day → 3-day minimum trip
    - If 2+ good days → good days + 1 day
    
    Args:
        good_days: List of good surf days in YYYY-MM-DD format
        min_days: Minimum trip duration (default: 3)
    
    Returns:
        Tuple of (depart_date, return_date, trip_duration)
    """
    if not good_days:
        raise ValueError('No good days provided for trip calculation')
    
    # Sort dates to ensure proper order
    sorted_days = sorted(good_days)
    first_good_day = sorted_days[0]
    last_good_day = sorted_days[-1]
    
    # Calculate return date based on logic
    if len(good_days) == 1:
        # Single good day → minimum trip duration from departure
        depart_date = datetime.strptime(first_good_day, '%Y-%m-%d')
        return_date = depart_date + timedelta(days=min_days)
    else:
        # Multiple good days → last good day + 1 day
        last_good_date = datetime.strptime(last_good_day, '%Y-%m-%d')
        return_date = last_good_date + timedelta(days=1)
    
    # Calculate trip duration
    depart_date = datetime.strptime(first_good_day, '%Y-%m-%d')
    trip_duration = (return_date - depart_date).days
    
    return (
        first_good_day,
        return_date.strftime('%Y-%m-%d'),
        trip_duration
    )


def format_date_for_aviasales(date_string: str) -> str:
    """
    Format date for Aviasales URL (DDMM format)
    
    Args:
        date_string: Date in YYYY-MM-DD format
    
    Returns:
        Date in DDMM format
    """
    date = datetime.strptime(date_string, '%Y-%m-%d')
    return f"{date.day:02d}{date.month:02d}"


def format_date_ymd(date_string: str) -> str:
    return date_string


def generate_aviasales_url(
    origin: str,
    destination: str,
    depart_date: str,
    return_date: str,
    marker: str,
    sub_id: str
) -> str:
    """
    Generate Aviasales affiliate URL
    
    Args:
        origin: Origin airport code (e.g., 'LIS')
        destination: Destination airport code (e.g., 'BIQ')
        depart_date: Departure date in YYYY-MM-DD format
        return_date: Return date in YYYY-MM-DD format
        marker: Affiliate marker
        sub_id: Sub ID for tracking
    
    Returns:
        Complete Aviasales affiliate URL
    """
    depart_formatted = format_date_for_aviasales(depart_date)
    return_formatted = format_date_for_aviasales(return_date)
    
    return f"https://aviasales.com/search/{origin}{depart_formatted}{destination}{return_formatted}?marker={marker}&sub_id={sub_id}"


def build_booking_link(city: str, check_in: str, check_out: str) -> str:
    ci = format_date_ymd(check_in); co = format_date_ymd(check_out)
    return (
        "https://www.booking.com/searchresults.html?"
        f"ss={requests.utils.quote(city)}&checkin={ci}&checkout={co}&group_adults=2&no_rooms=1&group_children=0"
    )

def build_google_hotels_link(city: str, check_in: str, check_out: str) -> str:
    ci = format_date_ymd(check_in); co = format_date_ymd(check_out)
    return (
        "https://www.google.com/travel/hotels/"
        f"{requests.utils.quote(city)}?checkin={ci}&checkout={co}"
    )

def build_expedia_link(city: str, check_in: str, check_out: str) -> str:
    ci = format_date_ymd(check_in); co = format_date_ymd(check_out)
    return (
        "https://www.expedia.com/Hotel-Search?"
        f"destination={requests.utils.quote(city)}&startDate={ci}&endDate={co}"
    )


def generate_affiliate_urls(
    good_days: List[str],
    origin: str,
    destination: str,
    marker: str,
    sub_id: str
) -> Tuple[str, Tuple[str, str, int]]:
    """
    Generate both flight and hotel affiliate URLs using unified date logic
    
    Args:
        good_days: List of good surf days
        origin: Origin airport code
        destination: Destination airport code
        marker: Affiliate marker
        sub_id: Sub ID for tracking
    
    Returns:
        Tuple of (flight_url, hotel_url, (depart_date, return_date, trip_duration))
    """
    depart_date, return_date, trip_duration = calculate_trip_dates(good_days)
    
    flight_url = generate_aviasales_url(
        origin,
        destination,
        depart_date,
        return_date,
        marker,
        sub_id
    )
    return flight_url, (depart_date, return_date, trip_duration)
