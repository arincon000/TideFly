#!/usr/bin/env python3
"""
Clean country data in spots CSV
Splits "Country, Region, Details" into separate columns
"""

import csv
import re

def parse_country_field(country_str):
    """
    Parse country field into clean components
    Examples:
    - "South Africa, SW Coast" → ("South Africa", None, "SW Coast")
    - "USA, California, San Diego County" → ("USA", "California", "San Diego County")
    - "Indonesia, East Java" → ("Indonesia", None, "East Java")
    - "Portugal" → ("Portugal", None, None)
    """
    
    if not country_str or country_str.strip() == '':
        return (None, None, None)
    
    parts = [p.strip() for p in country_str.split(',')]
    
    if len(parts) == 1:
        # Just country
        return (parts[0], None, None)
    elif len(parts) == 2:
        # Country, Region
        return (parts[0], None, parts[1])
    else:
        # Country, State/Province, Region (e.g., USA, California, San Diego)
        return (parts[0], parts[1], ', '.join(parts[2:]))

def clean_csv(input_file, output_file):
    """Clean the spots CSV"""
    
    print(f"🔄 Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"✅ Loaded {len(rows)} spots")
    print(f"🧹 Cleaning country data...")
    
    # Add new parsed fields
    for row in rows:
        country, state, region = parse_country_field(row.get('country', ''))
        row['country_clean'] = country or row.get('country', '')
        row['state_province'] = state or ''
        row['region_detail'] = region or ''
    
    # Write to new CSV with new columns
    print(f"💾 Writing to {output_file}...")
    
    fieldnames = [
        'name', 'country', 'country_clean', 'state_province', 'region_detail',
        'latitude', 'longitude', 'timezone',
        'skill_level_min', 'skill_level_max', 'primary_airport_iata', 'region_major',
        'slug', 'active'
    ]
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"✅ Done! Cleaned CSV saved to {output_file}")
    
    # Show some examples
    print(f"\n📊 Sample cleaned data:")
    for i, row in enumerate(rows[:5]):
        print(f"   {i+1}. {row['name']}")
        print(f"      Original: {row['country']}")
        print(f"      Country: {row['country_clean']}")
        print(f"      State: {row['state_province'] or '(none)'}")
        print(f"      Region: {row['region_detail'] or '(none)'}")
        print()

if __name__ == "__main__":
    clean_csv('spots_classified_full.csv', 'spots_classified_cleaned.csv')



