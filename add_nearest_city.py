#!/usr/bin/env python3
"""
Add nearest city and Hotellook city ID to surf spots CSV
"""

import csv
import requests
import time
from math import radians, cos, sin, asin, sqrt
from typing import Optional, Tuple

class CityEnricher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "TideFly-SurfSpotEnricher/1.0"})
        self.cache = {}  # Cache Hotellook lookups
    
    def normalize_city_name(self, city_name: str) -> str:
        """
        Normalize city names to match Hotellook format
        Examples:
        - "City of Greater Geelong" → "Geelong"
        - "Escambia County" → "Escambia"
        - "Newport County" → "Newport"
        """
        # Remove common prefixes
        prefixes = [
            "City of Greater ",
            "City of ",
            "Municipality of ",
            "Town of ",
            "Village of ",
        ]
        
        normalized = city_name
        for prefix in prefixes:
            if normalized.startswith(prefix):
                normalized = normalized[len(prefix):]
        
        # Remove " County" suffix
        if normalized.endswith(" County"):
            normalized = normalized[:-7]
        
        return normalized.strip()
        
    def haversine(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        """
        Calculate the great circle distance between two points 
        on the earth (specified in decimal degrees)
        Returns distance in kilometers
        """
        # Convert decimal degrees to radians
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        
        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Radius of Earth in kilometers
        return c * r
    
    def get_nearest_city_osm(self, lat: float, lng: float) -> Tuple[Optional[str], Optional[str]]:
        """
        Use OpenStreetMap Nominatim to find nearest city
        Returns (city_name, country_code)
        """
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "addressdetails": 1,
            "zoom": 10,  # City level
            "accept-language": "en"
        }
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            address = data.get("address", {})
            
            # Try to get city in order of specificity
            city = (
                address.get("city") or 
                address.get("town") or 
                address.get("village") or
                address.get("municipality") or
                address.get("suburb") or
                address.get("county")
            )
            
            country_code = address.get("country_code", "").upper()
            
            if city:
                print(f"      📍 OSM found: {city}, {country_code}")
                return city, country_code
            else:
                print(f"      ⚠️  OSM couldn't find city for {lat}, {lng}")
                return None, None
                
        except Exception as e:
            print(f"      ⚠️  OSM error: {e}")
            return None, None
    
    def get_hotellook_city_id(self, city_name: str, country_code: str = "", spot_lat: float = None, spot_lng: float = None) -> Tuple[Optional[int], Optional[str], Optional[float]]:
        """
        Query Hotellook API to get city ID
        Returns (city_id, matched_city_name, distance_km)
        """
        # Check cache first
        cache_key = f"{city_name}_{country_code}".lower()
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        url = "https://engine.hotellook.com/api/v2/lookup.json"
        params = {
            "query": city_name,
            "lang": "en",
            "lookFor": "city",
            "limit": 10  # Get more matches to find best one
        }
        
        try:
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # API returns results.locations (not cities)
            results = data.get("results", {}).get("locations", [])
            
            if not results:
                print(f"      ⚠️  Hotellook: No cities found for '{city_name}'")
                self.cache[cache_key] = (None, None, None)
                return None, None, None
            
            # CRITICAL: Always filter by country code if provided (prevents wrong country matches)
            if country_code:
                country_matches = [c for c in results if c.get("countryCode", "").upper() == country_code.upper()]
                if country_matches:
                    results = country_matches
                else:
                    # No results in the correct country - reject entirely
                    print(f"      ⚠️  No cities found in country {country_code}")
                    self.cache[cache_key] = (None, None, None)
                    return None, None, None
            
            # If we have spot coordinates, find closest city
            if spot_lat and spot_lng:
                best_match = None
                best_distance = float('inf')
                
                for city in results:
                    city_lat = city.get("location", {}).get("lat")
                    city_lng = city.get("location", {}).get("lon")
                    
                    if city_lat and city_lng:
                        try:
                            # Convert to float (API may return strings)
                            city_lat = float(city_lat)
                            city_lng = float(city_lng)
                            distance = self.haversine(spot_lng, spot_lat, city_lng, city_lat)
                            if distance < best_distance:
                                best_distance = distance
                                best_match = city
                        except (ValueError, TypeError):
                            continue
                
                if best_match:
                    city_id = best_match.get("id")
                    # Try multiple fields for city name
                    matched_name = (
                        best_match.get("cityName") or
                        best_match.get("name") or
                        best_match.get("fullName", "").split(",")[0]
                    )
                    matched_country = best_match.get("countryCode", "")
                    
                    print(f"      🏨 Hotellook found: {matched_name} ({matched_country}) - ID: {city_id} ({best_distance:.1f}km away)")
                    
                    self.cache[cache_key] = (city_id, matched_name, best_distance)
                    return city_id, matched_name, best_distance
            
            # Otherwise take first result
            best_match = results[0]
            city_id = best_match.get("id")
            # Try multiple fields for city name
            matched_name = (
                best_match.get("cityName") or
                best_match.get("name") or
                best_match.get("fullName", "").split(",")[0]
            )
            matched_country = best_match.get("countryCode", "")
            
            print(f"      🏨 Hotellook found: {matched_name} ({matched_country}) - ID: {city_id}")
            
            self.cache[cache_key] = (city_id, matched_name, None)
            return city_id, matched_name, None
            
        except Exception as e:
            print(f"      ⚠️  Hotellook error: {e}")
            self.cache[cache_key] = (None, None, None)
            return None, None, None
    
    def enrich_spot(self, spot: dict, index: int, total: int) -> dict:
        """
        Add nearest_city and hotellook_city_id to a spot
        """
        name = spot['name']
        try:
            lat = float(spot['latitude'])
            lng = float(spot['longitude'])
        except (ValueError, KeyError):
            # Invalid coordinates
            spot['nearest_city'] = ''
            spot['nearest_city_distance_km'] = ''
            spot['hotellook_city_id'] = ''
            spot['hotellook_city_name'] = ''
            spot['hotellook_city_distance_km'] = ''
            return spot
        
        country_clean = spot.get('country_clean', '')
        
        print(f"\n[{index}/{total}] Processing: {name}")
        
        # Step 1: Get nearest city/town using OSM (always capture this)
        city_name, country_code = self.get_nearest_city_osm(lat, lng)
        
        if not city_name:
            # No city found at all
            spot['nearest_city'] = ''
            spot['nearest_city_distance_km'] = ''
            spot['hotellook_city_id'] = ''
            spot['hotellook_city_name'] = ''
            spot['hotellook_city_distance_km'] = ''
            return spot
        
        # Always set nearest city (the actual closest place)
        spot['nearest_city'] = city_name
        spot['nearest_city_distance_km'] = '0'  # OSM gives us the exact location
        
        # Step 2: Try to find this city in Hotellook
        time.sleep(1.1)  # Respect OSM rate limit (1 req/sec)
        
        city_id, matched_name, distance = self.get_hotellook_city_id(
            city_name, country_code, lat, lng
        )
        
        # Validate distance even for direct matches (catches wrong cities with same name)
        if city_id and distance and distance > 100:
            print(f"      ⚠️  Rejecting {matched_name} - too far away ({distance:.1f}km > 100km)")
            city_id, matched_name, distance = None, None, None
        
        # Step 2b: If no match, try normalized city name (e.g., "City of Geelong" → "Geelong")
        if not city_id:
            normalized_name = self.normalize_city_name(city_name)
            if normalized_name != city_name:
                print(f"      🔍 Trying normalized name: '{normalized_name}'")
                city_id, matched_name, distance = self.get_hotellook_city_id(
                    normalized_name, country_code, lat, lng
                )
                
                # Validate distance for normalized matches too
                if city_id and distance and distance > 100:
                    print(f"      ⚠️  Rejecting {matched_name} - too far away ({distance:.1f}km > 100km)")
                    city_id, matched_name, distance = None, None, None
        
        # Step 3: If still no match, search for major cities in the country (within reasonable distance)
        if not city_id and country_clean:
            print(f"      🔍 Searching for major cities in {country_clean} with hotels...")
            city_id, matched_name, distance = self.get_hotellook_city_id(
                country_clean, country_code, lat, lng
            )
            
            # CRITICAL: Apply distance threshold based on how we found the city
            # - Direct city match: Accept up to 100km (nearby city with same name)
            # - Country search fallback: Accept only up to 100km (reject random distant cities)
            max_distance = 100  # Reasonable driving distance for hotel bookings
            
            if distance and distance > max_distance:
                print(f"      ⚠️  Rejecting {matched_name} - too far away ({distance:.1f}km > {max_distance}km)")
                city_id, matched_name, distance = None, None, None
        
        # Set Hotellook data (may be different from nearest_city)
        spot['hotellook_city_id'] = city_id if city_id else ''
        spot['hotellook_city_name'] = matched_name if matched_name else ''
        spot['hotellook_city_distance_km'] = f"{distance:.1f}" if distance else ''
        
        # Show summary
        if city_id and matched_name != city_name:
            print(f"      ℹ️  Nearest town: {city_name} | Nearest bookable city: {matched_name}")
        elif not city_id:
            print(f"      ℹ️  No suitable hotel city found within 200km")
        
        return spot
    
    def process_csv(self, input_file: str, output_file: str, limit: int = None):
        """
        Process the entire CSV file
        """
        print(f"🔄 Reading {input_file}...")
        
        with open(input_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        
        total = len(rows) if not limit else min(limit, len(rows))
        print(f"✅ Loaded {len(rows)} spots (processing {total})")
        
        print("\n🔄 Enriching spots with nearest city data...\n")
        
        # Process spots
        enriched_rows = []
        for i, row in enumerate(rows[:total], 1):
            enriched_row = self.enrich_spot(row, i, total)
            enriched_rows.append(enriched_row)
            
            # Save progress every 50 spots
            if i % 50 == 0:
                self.save_progress(enriched_rows, output_file)
                print(f"\n   ✅ Progress saved! ({i}/{total} spots)\n")
        
        # Final save
        self.save_progress(enriched_rows, output_file)
        
        print(f"\n✅ Done! Enriched CSV saved to {output_file}")
        
        # Statistics
        with_city = sum(1 for r in enriched_rows if r.get('nearest_city'))
        with_hotellook = sum(1 for r in enriched_rows if r.get('hotellook_city_id'))
        different_cities = sum(1 for r in enriched_rows if r.get('nearest_city') and r.get('hotellook_city_name') and r.get('nearest_city') != r.get('hotellook_city_name'))
        
        print(f"\n📊 Statistics:")
        print(f"   Total spots: {total}")
        print(f"   With nearest city/town: {with_city} ({with_city/total*100:.1f}%)")
        print(f"   With Hotellook bookable city: {with_hotellook} ({with_hotellook/total*100:.1f}%)")
        print(f"   Different nearest vs bookable: {different_cities} ({different_cities/total*100:.1f}%)")
    
    def save_progress(self, rows: list, output_file: str):
        """Save progress to CSV"""
        if not rows:
            return
        
        # Get all fieldnames (original + new)
        fieldnames = list(rows[0].keys())
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Add nearest city and Hotellook city ID to surf spots")
    parser.add_argument('--input', default='spots_classified_final.csv', help='Input CSV file')
    parser.add_argument('--output', default='spots_with_cities.csv', help='Output CSV file')
    parser.add_argument('--limit', type=int, help='Limit number of spots to process (for testing)')
    
    args = parser.parse_args()
    
    enricher = CityEnricher()
    enricher.process_csv(args.input, args.output, args.limit)


if __name__ == "__main__":
    main()

