#!/usr/bin/env python3
"""
🌊 TideFly Surf Spot Classifier
Uses GPT-4o-mini to classify 5,980 surf spots by difficulty level.
Cost: ~$0.08 total | Time: ~10-15 minutes
"""

import requests
import json
import csv
import time
from datetime import datetime
from typing import List, Dict, Optional
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import pandas as pd
import argparse
import os

class SpotClassifier:
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        self.geolocator = Nominatim(user_agent="tidefly_spot_classifier")
        self.airports_df = self.load_airports()
        self.classified_spots = []
        self.batch_size = 50  # Classify 50 spots per API call
        
        # Region mapping (country -> region_major)
        self.REGION_MAP = {
            'Portugal': 'Europe', 'Spain': 'Europe', 'France': 'Europe',
            'UK': 'Europe', 'Ireland': 'Europe', 'Italy': 'Europe',
            'Germany': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe',
            'Denmark': 'Europe', 'Norway': 'Europe', 'Sweden': 'Europe',
            'Iceland': 'Europe', 'Morocco': 'Africa', 'South Africa': 'Africa',
            'USA': 'North America', 'Mexico': 'North America', 'Canada': 'North America',
            'Costa Rica': 'Central America', 'Panama': 'Central America',
            'Brazil': 'South America', 'Chile': 'South America', 'Peru': 'South America',
            'Indonesia': 'Asia', 'Philippines': 'Asia', 'Thailand': 'Asia',
            'Sri Lanka': 'Asia', 'Maldives': 'Asia', 'Japan': 'Asia',
            'Australia': 'Oceania', 'New Zealand': 'Oceania', 'Fiji': 'Oceania',
            'Tahiti': 'Oceania', 'Hawaii': 'Oceania'
        }
    
    def load_airports(self) -> pd.DataFrame:
        """Load airports dataset"""
        try:
            df = pd.read_csv('airports.csv')
            print(f"✅ Loaded {len(df)} airports")
            return df
        except FileNotFoundError:
            print("⚠️  airports.csv not found - downloading...")
            url = "https://davidmegginson.github.io/ourairports-data/airports.csv"
            df = pd.read_csv(url)
            df.to_csv('airports.csv', index=False)
            print(f"✅ Downloaded {len(df)} airports")
            return df
    
    def fetch_spots_from_gist(self) -> List[Dict]:
        """Fetch 5,980 spots from GitHub Gist"""
        print("\n🌊 Fetching spots from GitHub Gist...")
        url = "https://gist.githubusercontent.com/naotokui/01c384bf58ca43261eafe6a5e2ad6e85/raw/surfspots.json"
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            spots = response.json()
            print(f"✅ Fetched {len(spots)} surf spots")
            return spots
        except Exception as e:
            print(f"❌ Error fetching spots: {e}")
            return []
    
    def classify_spots_batch(self, spots: List[Dict]) -> List[Dict]:
        """Classify a batch of spots using GPT-4o-mini"""
        
        # Prepare batch prompt
        spots_text = "\n".join([
            f"{i+1}. {spot['name']}, {spot['country']}"
            for i, spot in enumerate(spots)
        ])
        
        prompt = f"""You are a surf spot difficulty classifier. Classify these {len(spots)} surf spots by their skill level RANGE.

**Difficulty Levels:**
- **beginner**: Small waves (0.5-1.5m), gentle beach breaks, safe for learning
- **intermediate**: Medium waves (1-2.5m), some power, requires experience
- **advanced**: Large/powerful waves (2.5m+), reef/point breaks, expert only

**Important:** Many spots work for multiple skill levels. Provide a range:
- "beginner-beginner" = pure beginner spot
- "beginner-intermediate" = works for beginners and intermediates
- "intermediate-advanced" = requires experience, experts excel
- "advanced-advanced" = expert only

**Spots to classify:**
{spots_text}

**Output format (JSON array):**
[
  {{"name": "Spot Name", "skill_level_min": "beginner|intermediate|advanced", "skill_level_max": "beginner|intermediate|advanced"}},
  ...
]

Return ONLY the JSON array, no other text."""

        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are a surf spot expert. Return only valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000
                },
                timeout=60
            )
            response.raise_for_status()
            
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            
            print(f"   🤖 GPT Response (first 200 chars): {content[:200]}")
            
            # Parse JSON response
            if content.startswith('```json'):
                content = content.split('```json')[1].split('```')[0].strip()
            elif content.startswith('```'):
                content = content.split('```')[1].split('```')[0].strip()
            
            classifications = json.loads(content)
            print(f"   ✅ Successfully classified {len(classifications)} spots")
            
            # Map classifications back to spots
            classified = []
            for spot in spots:
                # Try exact match first, then fuzzy match (name in classification)
                match = next((c for c in classifications if c['name'] == spot['name']), None)
                if not match:
                    # Try matching by checking if spot name is in the classification name
                    match = next((c for c in classifications if spot['name'] in c['name']), None)
                
                if match:
                    spot['skill_level_min'] = match.get('skill_level_min', 'intermediate')
                    spot['skill_level_max'] = match.get('skill_level_max', 'intermediate')
                else:
                    print(f"   ⚠️  No match found for: {spot['name']}")
                    spot['skill_level_min'] = 'intermediate'  # Default fallback
                    spot['skill_level_max'] = 'intermediate'
                classified.append(spot)
            
            return classified
            
        except Exception as e:
            print(f"⚠️  Classification error: {e}")
            print(f"⚠️  Error type: {type(e).__name__}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"⚠️  Response status: {e.response.status_code}")
                print(f"⚠️  Response body: {e.response.text[:500]}")
            # Fallback: assign intermediate to all
            for spot in spots:
                spot['skill_level_min'] = 'intermediate'
                spot['skill_level_max'] = 'intermediate'
            return spots
    
    def find_nearest_airport(self, lat: float, lng: float) -> Optional[str]:
        """Find nearest airport with IATA code within 300km"""
        spot_coords = (lat, lng)
        
        # Filter airports with IATA codes
        airports = self.airports_df[
            (self.airports_df['iata_code'].notna()) & 
            (self.airports_df['iata_code'] != '')
        ]
        
        min_distance = float('inf')
        nearest_iata = None
        
        for _, airport in airports.iterrows():
            try:
                airport_coords = (airport['latitude_deg'], airport['longitude_deg'])
                distance = geodesic(spot_coords, airport_coords).km
                
                if distance < min_distance and distance <= 300:
                    min_distance = distance
                    nearest_iata = airport['iata_code']
            except:
                continue
        
        return nearest_iata
    
    def get_timezone(self, lat: float, lng: float, country: str) -> str:
        """Get timezone for coordinates"""
        try:
            location = self.geolocator.reverse(f"{lat}, {lng}", language='en', timeout=10)
            if location and 'timezone' in location.raw.get('address', {}):
                return location.raw['address']['timezone']
        except:
            pass
        
        # Fallback timezone mapping
        tz_map = {
            'Portugal': 'Europe/Lisbon', 'Spain': 'Europe/Madrid',
            'France': 'Europe/Paris', 'UK': 'Europe/London',
            'Morocco': 'Africa/Casablanca', 'South Africa': 'Africa/Johannesburg',
            'USA': 'America/Los_Angeles', 'Mexico': 'America/Mexico_City',
            'Brazil': 'America/Sao_Paulo', 'Indonesia': 'Asia/Jakarta',
            'Australia': 'Australia/Sydney', 'New Zealand': 'Pacific/Auckland'
        }
        
        for key, tz in tz_map.items():
            if key in country:
                return tz
        
        return 'UTC'
    
    def get_region(self, country: str) -> str:
        """Map country to region_major"""
        for key, region in self.REGION_MAP.items():
            if key in country:
                return region
        return 'Other'
    
    def process_spots(self, spots: List[Dict], limit: Optional[int] = None):
        """Process and classify all spots"""
        
        if limit:
            spots = spots[:limit]
        
        total = len(spots)
        print(f"\n🔄 Processing {total} spots...")
        print(f"📊 Batch size: {self.batch_size} spots per API call")
        print(f"⏱️  Estimated time: {(total / self.batch_size) * 2} minutes\n")
        
        # Process in batches
        for i in range(0, total, self.batch_size):
            batch = spots[i:i+self.batch_size]
            batch_num = (i // self.batch_size) + 1
            total_batches = (total + self.batch_size - 1) // self.batch_size
            
            progress_pct = (batch_num / total_batches) * 100
            print(f"\n[Batch {batch_num}/{total_batches}] ({progress_pct:.1f}%) Classifying spots {i+1}-{min(i+self.batch_size, total)}...")
            print(f"   🔄 Calling GPT-4o-mini API...")
            
            # Classify batch
            classified_batch = self.classify_spots_batch(batch)
            print(f"   ✅ API response received, processing spots...")
            
            # Enrich each spot
            for j, spot in enumerate(classified_batch):
                spot_num = i + j + 1
                
                # Validate coordinates
                try:
                    lat = float(spot['lat'])
                    lng = float(spot['lng'])
                except (ValueError, TypeError):
                    print(f"   ⚠️  [{spot_num}/{total}] {spot['name']} → SKIPPED (invalid coordinates)")
                    continue
                
                print(f"   [{spot_num}/{total}] {spot['name']} → {spot['skill_level_min']}-{spot['skill_level_max']}")
                
                # Add enrichment data
                spot['latitude'] = lat
                spot['longitude'] = lng
                spot['timezone'] = self.get_timezone(lat, lng, spot['country'])
                spot['region_major'] = self.get_region(spot['country'])
                spot['primary_airport_iata'] = self.find_nearest_airport(lat, lng)
                spot['slug'] = spot['name'].lower().replace(' ', '-').replace(',', '')
                spot['active'] = True
                
                self.classified_spots.append(spot)
            
            elapsed_batches = batch_num
            remaining_batches = total_batches - batch_num
            print(f"   ✅ Batch {batch_num} complete! ({len(self.classified_spots)}/{total} spots done)")
            
            # Save progress after every batch
            self.save_progress_csv()
            
            if remaining_batches > 0:
                est_time_remaining = remaining_batches * 4  # ~4 seconds per batch
                print(f"   ⏱️  Estimated time remaining: ~{est_time_remaining//60}m {est_time_remaining%60}s")
            
            # Rate limiting
            if i + self.batch_size < total:
                time.sleep(2)
    
    def save_progress_csv(self):
        """Save progress to temporary CSV file"""
        if not self.classified_spots:
            return
        
        filename = "spots_progress.csv"
        fieldnames = [
            'name', 'country', 'latitude', 'longitude', 'timezone',
            'skill_level_min', 'skill_level_max', 'primary_airport_iata', 'region_major',
            'slug', 'active'
        ]
        
        try:
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for spot in self.classified_spots:
                    writer.writerow({
                        'name': spot['name'],
                        'country': spot['country'],
                        'latitude': spot['latitude'],
                        'longitude': spot['longitude'],
                        'timezone': spot['timezone'],
                        'skill_level_min': spot['skill_level_min'],
                        'skill_level_max': spot['skill_level_max'],
                        'primary_airport_iata': spot.get('primary_airport_iata', ''),
                        'region_major': spot['region_major'],
                        'slug': spot['slug'],
                        'active': spot['active']
                    })
            print(f"   💾 Progress saved ({len(self.classified_spots)} spots)")
        except Exception as e:
            print(f"   ⚠️  Could not save progress: {e}")
    
    def export_csv(self, filename: str):
        """Export classified spots to CSV"""
        print(f"\n💾 Exporting to {filename}...")
        
        fieldnames = [
            'name', 'country', 'latitude', 'longitude', 'timezone',
            'skill_level_min', 'skill_level_max', 'primary_airport_iata', 'region_major',
            'slug', 'active'
        ]
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for spot in self.classified_spots:
                writer.writerow({
                    'name': spot['name'],
                    'country': spot['country'],
                    'latitude': spot['latitude'],
                    'longitude': spot['longitude'],
                    'timezone': spot['timezone'],
                    'skill_level_min': spot['skill_level_min'],
                    'skill_level_max': spot['skill_level_max'],
                    'primary_airport_iata': spot.get('primary_airport_iata', ''),
                    'region_major': spot['region_major'],
                    'slug': spot['slug'],
                    'active': spot['active']
                })
        
        print(f"✅ Exported {len(self.classified_spots)} spots to {filename}")
        
        # Print summary
        beginner_only = sum(1 for s in self.classified_spots if s['skill_level_min'] == 'beginner' and s['skill_level_max'] == 'beginner')
        beginner_inter = sum(1 for s in self.classified_spots if s['skill_level_min'] == 'beginner' and s['skill_level_max'] == 'intermediate')
        inter_only = sum(1 for s in self.classified_spots if s['skill_level_min'] == 'intermediate' and s['skill_level_max'] == 'intermediate')
        inter_adv = sum(1 for s in self.classified_spots if s['skill_level_min'] == 'intermediate' and s['skill_level_max'] == 'advanced')
        adv_only = sum(1 for s in self.classified_spots if s['skill_level_min'] == 'advanced' and s['skill_level_max'] == 'advanced')
        
        print(f"\n📊 Classification Summary:")
        print(f"   🟢 Beginner only: {beginner_only}")
        print(f"   🟢🟡 Beginner-Intermediate: {beginner_inter}")
        print(f"   🟡 Intermediate only: {inter_only}")
        print(f"   🟡🔴 Intermediate-Advanced: {inter_adv}")
        print(f"   🔴 Advanced only: {adv_only}")


def main():
    parser = argparse.ArgumentParser(description='Classify surf spots using GPT-4o-mini')
    parser.add_argument('--api-key', required=True, help='OpenAI API key')
    parser.add_argument('--limit', type=int, help='Limit number of spots (for testing)')
    parser.add_argument('--output', default='spots_classified.csv', help='Output CSV filename')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🌊 TideFly Surf Spot Classifier (GPT-4o-mini)")
    print("=" * 60)
    
    classifier = SpotClassifier(args.api_key)
    
    # Fetch spots
    spots = classifier.fetch_spots_from_gist()
    if not spots:
        print("❌ No spots fetched, exiting")
        return
    
    # Process spots
    classifier.process_spots(spots, limit=args.limit)
    
    # Export
    classifier.export_csv(args.output)
    
    print("\n✅ Done!")


if __name__ == "__main__":
    main()
