#!/usr/bin/env python3
"""
Add full_location_name column to spots CSV
Combines: name + state/province + region_detail (intelligently, no empty spaces)
"""

import csv

def create_full_location_name(name, state_province, region_detail):
    """
    Create full location name from components
    Examples:
    - "Biarritz", "", "" → "Biarritz"
    - "13th beach", "VIC", "Melbourne West" → "13th beach, VIC, Melbourne West"
    - "Sagres", "", "Tonel" → "Sagres, Tonel"
    """
    parts = [name.strip()]
    
    if state_province and state_province.strip():
        parts.append(state_province.strip())
    
    if region_detail and region_detail.strip():
        parts.append(region_detail.strip())
    
    return ', '.join(parts)

def add_full_location_column(input_file, output_file):
    """Add full_location_name column to CSV"""
    
    print(f"🔄 Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"✅ Loaded {len(rows)} spots")
    print(f"🔄 Creating full location names...")
    
    # Add full_location_name field
    for row in rows:
        name = row.get('name', '')
        state = row.get('state_province', '')
        region = row.get('region_detail', '')
        
        row['full_location_name'] = create_full_location_name(name, state, region)
    
    # Write to new CSV with new column
    print(f"💾 Writing to {output_file}...")
    
    fieldnames = [
        'name', 'full_location_name', 'country', 'country_clean', 'state_province', 'region_detail',
        'latitude', 'longitude', 'timezone',
        'skill_level_min', 'skill_level_max', 'primary_airport_iata', 'region_major',
        'slug', 'active'
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"✅ Done! Updated CSV saved to {output_file}")
    
    # Show some examples
    print(f"\n📊 Sample full location names:")
    examples = [
        # Simple names only
        next((r for r in rows if not r.get('state_province') and not r.get('region_detail')), None),
        # With state only
        next((r for r in rows if r.get('state_province') and not r.get('region_detail')), None),
        # With region only
        next((r for r in rows if not r.get('state_province') and r.get('region_detail')), None),
        # With both
        next((r for r in rows if r.get('state_province') and r.get('region_detail')), None),
    ]
    
    for i, row in enumerate([r for r in examples if r], 1):
        print(f"\n   Example {i}:")
        print(f"      Name: {row['name']}")
        print(f"      State: {row.get('state_province', '(none)')}")
        print(f"      Region: {row.get('region_detail', '(none)')}")
        print(f"      Full: {row['full_location_name']}")

if __name__ == "__main__":
    add_full_location_column('spots_classified_cleaned.csv', 'spots_classified_final.csv')


