"""
TideFly Surf Spot Sourcing Agent
=================================
Automated agent to source 1000+ surf spots with accurate metadata.

Requirements:
    pip install requests pandas geopy anthropic

Usage:
    python spot_sourcing_agent.py --region europe --limit 500
    python spot_sourcing_agent.py --region global --limit 1000
"""

import requests
import json
import csv
import time
import argparse
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from geopy.distance import geodesic
import pandas as pd

# Optional: Anthropic for LLM enrichment (requires API key)
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
    print("⚠️  anthropic not installed. LLM enrichment will be skipped.")


@dataclass
class SurfSpot:
    """Data structure for a surf spot"""
    id: str
    name: str
    country: str
    latitude: float
    longitude: float
    timezone: str
    seasonality: str
    difficulty: str
    primary_airport_iata: str
    region_major: str
    skill_level: str
    orientation: Optional[str] = None
    wave_min_m: Optional[float] = None
    wave_max_m: Optional[float] = None
    wind_max_kmh: Optional[float] = None
    season_months: Optional[str] = None
    notes: Optional[str] = None
    slug: Optional[str] = None
    active: bool = True
    source: str = "osm"  # osm, wikidata, manual


class SpotSourcingAgent:
    """Main agent for sourcing surf spots"""
    
    # Regional bounding boxes (lat_min, lon_min, lat_max, lon_max)
    REGIONS = {
        'europe': (35.0, -15.0, 72.0, 40.0),
        'north_america_west': (32.0, -130.0, 60.0, -110.0),
        'central_america': (7.0, -95.0, 22.0, -75.0),
        'south_america': (-56.0, -82.0, 13.0, -34.0),
        'africa': (-35.0, -20.0, 38.0, 52.0),
        'asia': (-11.0, 60.0, 50.0, 150.0),
        'oceania': (-48.0, 110.0, -10.0, 180.0),
        'global': (-90.0, -180.0, 90.0, 180.0),
    }
    
    SKILL_MAPPING = {
        'beginner': ['beginner', 'easy', 'gentle', 'mellow'],
        'intermediate': ['intermediate', 'medium', 'moderate'],
        'advanced': ['advanced', 'expert', 'big wave', 'heavy', 'powerful']
    }
    
    def __init__(self, anthropic_api_key: Optional[str] = None):
        self.anthropic_client = None
        if anthropic_api_key and HAS_ANTHROPIC:
            self.anthropic_client = anthropic.Anthropic(api_key=anthropic_api_key)
        
        # Load airports data
        self.airports_df = self.load_airports()
        
        # Cache for deduplication
        self.seen_spots = set()
    
    def load_airports(self) -> pd.DataFrame:
        """Load airport data from OurAirports"""
        print("📍 Loading airport data...")
        try:
            # Download OurAirports data
            url = "https://davidmegginson.github.io/ourairports-data/airports.csv"
            df = pd.read_csv(url)
            
            # Filter to only airports with IATA codes
            df = df[df['iata_code'].notna()]
            df = df[['iata_code', 'name', 'latitude_deg', 'longitude_deg', 'iso_country']]
            df = df.rename(columns={'latitude_deg': 'latitude', 'longitude_deg': 'longitude'})
            
            print(f"✅ Loaded {len(df)} airports with IATA codes")
            return df
        except Exception as e:
            print(f"❌ Error loading airports: {e}")
            return pd.DataFrame()
    
    def is_surf_business(self, name: str, tags: Dict) -> bool:
        """Check if this is a surf school/shop rather than a surf spot"""
        name_lower = name.lower()
        
        # Filter out businesses
        business_keywords = ['school', 'shop', 'store', 'club', 'academy', 
                           'lessons', 'rental', 'center', 'centre', 'association',
                           'federation', 'company', 'e.v.', 'ltd', 'inc']
        
        for keyword in business_keywords:
            if keyword in name_lower:
                return True
        
        # Check OSM tags for business indicators
        if tags.get('shop'):
            return True
        if tags.get('amenity') in ['school', 'shop', 'store']:
            return True
        
        return False
    
    def fetch_osm_spots(self, region: str) -> List[Dict]:
        """Fetch surf spots from OpenStreetMap"""
        print(f"\n🌊 Fetching surf spots from OpenStreetMap ({region})...")
        
        if region not in self.REGIONS:
            print(f"❌ Unknown region: {region}")
            return []
        
        bbox = self.REGIONS[region]
        bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
        
        # Overpass API query - Focus on beaches and named surf spots
        overpass_url = "http://overpass-api.de/api/interpreter"
        query = f"""
        [out:json][timeout:180];
        (
          node["natural"="beach"]["surfing"="yes"]({bbox_str});
          node["sport"="surfing"]["name"]({bbox_str});
          way["natural"="beach"]["surfing"="yes"]({bbox_str});
          way["sport"="surfing"]["name"]({bbox_str});
        );
        out center;
        """
        
        try:
            print("   Querying Overpass API (this may take 30-60 seconds)...")
            response = requests.post(overpass_url, data={'data': query}, timeout=200)
            response.raise_for_status()
            data = response.json()
            
            spots = []
            for element in data.get('elements', []):
                # Get coordinates (handle both nodes and ways)
                if element['type'] == 'node':
                    lat, lon = element['lat'], element['lon']
                elif element['type'] == 'way' and 'center' in element:
                    lat, lon = element['center']['lat'], element['center']['lon']
                else:
                    continue
                
                # Get name
                tags = element.get('tags', {})
                name = tags.get('name', f"Unnamed Spot {element['id']}")
                
                spots.append({
                    'osm_id': element['id'],
                    'name': name,
                    'latitude': lat,
                    'longitude': lon,
                    'tags': tags
                })
            
            print(f"✅ Found {len(spots)} spots from OSM")
            return spots
            
        except Exception as e:
            print(f"❌ Error fetching from OSM: {e}")
            return []
    
    def find_nearest_airport(self, lat: float, lon: float, max_distance_km: int = 300) -> Optional[str]:
        """Find nearest airport with IATA code"""
        if self.airports_df.empty:
            return None
        
        spot_coords = (lat, lon)
        
        # Calculate distances to all airports
        distances = []
        for _, airport in self.airports_df.iterrows():
            airport_coords = (airport['latitude'], airport['longitude'])
            distance = geodesic(spot_coords, airport_coords).km
            if distance <= max_distance_km:
                distances.append((distance, airport['iata_code']))
        
        if distances:
            distances.sort()
            return distances[0][1]
        
        return None
    
    def geocode_location(self, lat: float, lon: float) -> Tuple[str, str]:
        """Get country and timezone from coordinates"""
        try:
            # Use OpenStreetMap Nominatim for reverse geocoding
            url = f"https://nominatim.openstreetmap.org/reverse"
            params = {
                'lat': lat,
                'lon': lon,
                'format': 'json',
                'zoom': 10
            }
            headers = {'User-Agent': 'TideFly-SpotAgent/1.0'}
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            address = data.get('address', {})
            country = address.get('country', 'Unknown')
            
            # Guess timezone based on country (simplified)
            timezone = self.guess_timezone(country, lat, lon)
            
            # Rate limit: sleep 1 second per request (Nominatim requirement)
            time.sleep(1)
            
            return country, timezone
            
        except Exception as e:
            print(f"   ⚠️  Geocoding error for ({lat}, {lon}): {e}")
            return "Unknown", "UTC"
    
    def guess_timezone(self, country: str, lat: float, lon: float) -> str:
        """Guess timezone based on country and coordinates"""
        # Simplified timezone mapping (expand as needed)
        country_tz_map = {
            'Portugal': 'Europe/Lisbon',
            'Spain': 'Europe/Madrid',
            'France': 'Europe/Paris',
            'United Kingdom': 'Europe/London',
            'Ireland': 'Europe/Dublin',
            'United States': 'America/Los_Angeles' if lon < -100 else 'America/New_York',
            'Australia': 'Australia/Sydney',
            'Indonesia': 'Asia/Jakarta',
            'Brazil': 'America/Sao_Paulo',
            'Mexico': 'America/Mexico_City',
            'Morocco': 'Africa/Casablanca',
        }
        
        return country_tz_map.get(country, 'UTC')
    
    def determine_skill_level(self, name: str, tags: Dict) -> str:
        """Determine skill level from name and tags"""
        name_lower = name.lower()
        
        for skill, keywords in self.SKILL_MAPPING.items():
            for keyword in keywords:
                if keyword in name_lower:
                    return skill
        
        # Default to intermediate
        return 'intermediate'
    
    def enrich_with_llm(self, spot: Dict) -> Dict:
        """Use Claude to enrich spot with surfing metadata"""
        if not self.anthropic_client:
            return {
                'seasonality': 'Year-round',
                'difficulty': 'All levels',
                'orientation': 'West',
                'wave_min_m': 1.0,
                'wave_max_m': 3.0,
                'wind_max_kmh': 30,
                'season_months': None,
                'notes': None
            }
        
        try:
            prompt = f"""You are a surf spot expert. Provide metadata for this surf spot in JSON format.

Spot: {spot['name']}
Country: {spot['country']}
Coordinates: {spot['latitude']}, {spot['longitude']}

Return ONLY a JSON object with these exact fields (no markdown, no explanation):
{{
  "seasonality": "Best season description (e.g., 'Sep-Mar best, summer ok')",
  "difficulty": "Difficulty level (e.g., 'Beginner/Intermediate' or 'Advanced')",
  "orientation": "Wave direction (N, S, E, W, NE, NW, SE, SW)",
  "wave_min_m": typical min wave height in meters (number),
  "wave_max_m": typical max wave height in meters (number),
  "wind_max_kmh": typical max surfable wind in km/h (number),
  "season_months": "Best months (e.g., 'Sep-Mar' or '10-3')" or null,
  "notes": "1-2 sentence description" or null
}}"""
            
            message = self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_text = message.content[0].text.strip()
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            
            enriched = json.loads(response_text)
            return enriched
            
        except Exception as e:
            print(f"   ⚠️  LLM enrichment error for {spot['name']}: {e}")
            return {
                'seasonality': 'Year-round',
                'difficulty': 'All levels',
                'orientation': None,
                'wave_min_m': None,
                'wave_max_m': None,
                'wind_max_kmh': None,
                'season_months': None,
                'notes': None
            }
    
    def is_ocean_spot(self, lat: float, lon: float) -> bool:
        """Check if this is an ocean surf spot (not river/lake)"""
        try:
            url = "https://marine-api.open-meteo.com/v1/marine"
            params = {
                'latitude': lat,
                'longitude': lon,
                'hourly': 'wave_height',
                'forecast_days': 1
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Check if we got valid wave data with meaningful heights
            if 'hourly' in data and 'wave_height' in data['hourly']:
                wave_heights = data['hourly']['wave_height']
                # Filter out None values
                valid_waves = [h for h in wave_heights if h is not None and h > 0.1]
                
                # Ocean spots should have at least 5 hours with waves > 0.1m
                # and average wave height > 0.3m
                if len(valid_waves) >= 5:
                    avg_wave = sum(valid_waves) / len(valid_waves)
                    return avg_wave > 0.3
            
            return False
            
        except Exception as e:
            # If API fails, assume it's not a valid spot
            return False
    
    def validate_openmeteo(self, lat: float, lon: float) -> bool:
        """Validate that OpenMeteo API works for these coordinates"""
        # Use the same check as is_ocean_spot
        return self.is_ocean_spot(lat, lon)
    
    def create_slug(self, name: str, country: str) -> str:
        """Create URL-friendly slug"""
        import re
        
        # Combine name and country
        text = f"{name}-{country}".lower()
        
        # Replace special characters
        text = re.sub(r'[àáâãäå]', 'a', text)
        text = re.sub(r'[èéêë]', 'e', text)
        text = re.sub(r'[ìíîï]', 'i', text)
        text = re.sub(r'[òóôõö]', 'o', text)
        text = re.sub(r'[ùúûü]', 'u', text)
        text = re.sub(r'[ñ]', 'n', text)
        text = re.sub(r'[ç]', 'c', text)
        
        # Replace spaces and special chars with hyphens
        text = re.sub(r'[^a-z0-9]+', '-', text)
        
        # Remove leading/trailing hyphens
        text = text.strip('-')
        
        return text
    
    def deduplicate_key(self, name: str, lat: float, lon: float) -> str:
        """Create deduplication key"""
        # Round coordinates to ~1km precision
        lat_rounded = round(lat, 2)
        lon_rounded = round(lon, 2)
        name_clean = name.lower().strip()
        return f"{name_clean}_{lat_rounded}_{lon_rounded}"
    
    def process_spots(self, region: str, limit: int, enrich: bool = True) -> List[SurfSpot]:
        """Main processing pipeline"""
        print(f"\n🚀 Starting spot sourcing for region: {region} (limit: {limit})")
        print("=" * 60)
        
        # Stage 1: Fetch raw spots from OSM
        raw_spots = self.fetch_osm_spots(region)
        
        if not raw_spots:
            print("❌ No spots found. Exiting.")
            return []
        
        # Stage 2: Process and enrich
        print(f"\n📊 Processing {len(raw_spots)} spots...")
        processed_spots = []
        
        for i, raw_spot in enumerate(raw_spots[:limit], 1):
            try:
                # Deduplication check
                dedup_key = self.deduplicate_key(
                    raw_spot['name'],
                    raw_spot['latitude'],
                    raw_spot['longitude']
                )
                
                if dedup_key in self.seen_spots:
                    continue
                
                self.seen_spots.add(dedup_key)
                
                print(f"\n[{i}/{min(limit, len(raw_spots))}] Processing: {raw_spot['name']}")
                
                # Filter out surf businesses (schools/shops)
                if self.is_surf_business(raw_spot['name'], raw_spot.get('tags', {})):
                    print("   ⚠️  Surf school/shop (not a surf spot), skipping...")
                    continue
                
                # Geocode
                print("   → Geocoding...")
                country, timezone = self.geocode_location(
                    raw_spot['latitude'],
                    raw_spot['longitude']
                )
                
                # Find nearest airport
                print("   → Finding nearest airport...")
                iata = self.find_nearest_airport(
                    raw_spot['latitude'],
                    raw_spot['longitude']
                )
                
                if not iata:
                    print("   ⚠️  No airport within 300km, skipping...")
                    continue
                
                # Check if it's an ocean spot (filter out river surfing)
                print("   → Checking if ocean spot...")
                if not self.is_ocean_spot(raw_spot['latitude'], raw_spot['longitude']):
                    print("   ⚠️  Not an ocean spot (likely river/lake), skipping...")
                    continue
                
                # Determine skill level
                skill_level = self.determine_skill_level(raw_spot['name'], raw_spot.get('tags', {}))
                
                # LLM enrichment
                enriched = {}
                if enrich and self.anthropic_client:
                    print("   → Enriching with LLM...")
                    spot_for_llm = {
                        'name': raw_spot['name'],
                        'country': country,
                        'latitude': raw_spot['latitude'],
                        'longitude': raw_spot['longitude']
                    }
                    enriched = self.enrich_with_llm(spot_for_llm)
                    time.sleep(0.5)  # Rate limit for API
                
                # Determine region_major
                region_major = self.determine_region_major(raw_spot['latitude'], raw_spot['longitude'])
                
                # Create spot object
                spot = SurfSpot(
                    id=f"osm-{raw_spot['osm_id']}",
                    name=raw_spot['name'],
                    country=country,
                    latitude=raw_spot['latitude'],
                    longitude=raw_spot['longitude'],
                    timezone=timezone,
                    seasonality=enriched.get('seasonality', 'Year-round'),
                    difficulty=enriched.get('difficulty', 'All levels'),
                    primary_airport_iata=iata,
                    region_major=region_major,
                    skill_level=skill_level,
                    orientation=enriched.get('orientation'),
                    wave_min_m=enriched.get('wave_min_m'),
                    wave_max_m=enriched.get('wave_max_m'),
                    wind_max_kmh=enriched.get('wind_max_kmh'),
                    season_months=enriched.get('season_months'),
                    notes=enriched.get('notes'),
                    slug=self.create_slug(raw_spot['name'], country),
                    active=True,
                    source='osm'
                )
                
                processed_spots.append(spot)
                print(f"   ✅ {spot.name} → {spot.primary_airport_iata} ({spot.country})")
                
            except Exception as e:
                print(f"   ❌ Error processing spot: {e}")
                continue
        
        print(f"\n✅ Successfully processed {len(processed_spots)} spots")
        return processed_spots
    
    def determine_region_major(self, lat: float, lon: float) -> str:
        """Determine major region from coordinates"""
        # Simple region classification
        if lat > 35 and lon > -15 and lon < 40:
            return 'Europe'
        elif lat > 15 and lon > -130 and lon < -50:
            return 'Americas'
        elif lat < 15 and lat > -35 and lon > -20 and lon < 52:
            return 'Africa'
        elif lat > -11 and lon > 60 and lon < 150:
            return 'Asia'
        elif lat < -10 and lon > 110:
            return 'Oceania'
        else:
            return 'Other'
    
    def export_to_csv(self, spots: List[SurfSpot], filename: str):
        """Export spots to CSV file"""
        print(f"\n💾 Exporting to {filename}...")
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            if spots:
                fieldnames = list(asdict(spots[0]).keys())
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for spot in spots:
                    writer.writerow(asdict(spot))
        
        print(f"✅ Exported {len(spots)} spots to {filename}")


def main():
    parser = argparse.ArgumentParser(description='TideFly Surf Spot Sourcing Agent')
    parser.add_argument('--region', type=str, default='europe',
                        choices=['europe', 'north_america_west', 'central_america', 
                                'south_america', 'africa', 'asia', 'oceania', 'global'],
                        help='Region to search for spots')
    parser.add_argument('--limit', type=int, default=100,
                        help='Maximum number of spots to process')
    parser.add_argument('--enrich', action='store_true',
                        help='Enable LLM enrichment (requires ANTHROPIC_API_KEY env var)')
    parser.add_argument('--anthropic-key', type=str,
                        help='Anthropic API key for LLM enrichment')
    parser.add_argument('--output', type=str, default='surf_spots.csv',
                        help='Output CSV filename')
    
    args = parser.parse_args()
    
    # Get API key from args or environment
    import os
    api_key = args.anthropic_key or os.getenv('ANTHROPIC_API_KEY')
    
    if args.enrich and not api_key:
        print("⚠️  --enrich requires ANTHROPIC_API_KEY environment variable or --anthropic-key argument")
        print("   Continuing without LLM enrichment...")
        args.enrich = False
    
    # Initialize agent
    agent = SpotSourcingAgent(anthropic_api_key=api_key if args.enrich else None)
    
    # Process spots
    spots = agent.process_spots(args.region, args.limit, enrich=args.enrich)
    
    # Export
    if spots:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{args.output.replace('.csv', '')}_{args.region}_{timestamp}.csv"
        agent.export_to_csv(spots, filename)
        
        print("\n" + "=" * 60)
        print(f"🎉 Done! {len(spots)} spots ready for Supabase import")
        print(f"📁 File: {filename}")
        print("\n💡 Next steps:")
        print("   1. Review the CSV file")
        print("   2. Import to Supabase using the dashboard or SQL")
        print("   3. Run validation queries to check data quality")
    else:
        print("\n❌ No spots were processed successfully")


if __name__ == '__main__':
    main()

