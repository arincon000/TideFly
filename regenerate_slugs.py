#!/usr/bin/env python3
"""
Regenerate slugs for all spots
Strategy: name + country_clean, with numeric suffixes for duplicates
"""

import csv
import re
from collections import Counter

def slugify(text):
    """
    Convert text to URL-friendly slug
    Examples:
    - "Biarritz - Côte des Basques" → "biarritz-cote-des-basques"
    - "13th St." → "13th-st"
    - "O'ahu" → "oahu"
    """
    # Convert to lowercase
    text = text.lower()
    
    # Remove accents/special characters
    replacements = {
        'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
        'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
        'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
        'ñ': 'n', 'ç': 'c',
        'ø': 'o', 'æ': 'ae', 'œ': 'oe',
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # Replace non-alphanumeric with hyphens
    text = re.sub(r'[^a-z0-9]+', '-', text)
    
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    # Collapse multiple hyphens
    text = re.sub(r'-+', '-', text)
    
    return text

def generate_unique_slug(full_location_name, country, slug_counter):
    """Generate unique slug with numeric suffix if needed"""
    base_slug = f"{slugify(full_location_name)}-{slugify(country)}"
    
    # Check if we need a suffix
    if slug_counter[base_slug] == 0:
        slug_counter[base_slug] += 1
        return base_slug
    else:
        # This slug already exists, add suffix
        slug_counter[base_slug] += 1
        return f"{base_slug}-{slug_counter[base_slug]}"

def regenerate_slugs(input_file, output_file):
    """Regenerate all slugs"""
    
    print(f"🔄 Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"✅ Loaded {len(rows)} spots")
    print(f"🔄 Generating unique slugs...")
    
    # Track slug usage
    slug_counter = Counter()
    
    # First pass: count how many times each base slug appears
    for row in rows:
        full_location_name = row.get('full_location_name', '').strip()
        country = row.get('country_clean', '').strip()
        base_slug = f"{slugify(full_location_name)}-{slugify(country)}"
        slug_counter[base_slug] = 0  # Initialize
    
    # Reset counter
    slug_counter = Counter()
    
    # Second pass: assign unique slugs
    for row in rows:
        full_location_name = row.get('full_location_name', '').strip()
        country = row.get('country_clean', '').strip()
        
        if not full_location_name or not country:
            row['slug'] = 'unknown'
            continue
        
        row['slug'] = generate_unique_slug(full_location_name, country, slug_counter)
    
    # Write updated CSV
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
    
    # Show statistics
    duplicates = sum(1 for count in slug_counter.values() if count > 1)
    print(f"\n📊 Slug Statistics:")
    print(f"   Total spots: {len(rows)}")
    print(f"   Unique base slugs: {len(slug_counter)}")
    print(f"   Spots with duplicate names: {sum(slug_counter.values()) - len(slug_counter)}")
    
    # Show examples
    print(f"\n📊 Sample slugs:")
    for i, row in enumerate(rows[:10], 1):
        print(f"   {i:2d}. {row['name']:40s} → {row['slug']}")
    
    # Show some duplicates if any
    duplicate_bases = [base for base, count in slug_counter.items() if count > 1]
    if duplicate_bases:
        print(f"\n📊 Sample duplicate names (with suffixes):")
        for base in duplicate_bases[:5]:
            matching_rows = [r for r in rows if r['slug'].startswith(base)]
            for row in matching_rows[:3]:
                location = f"{row.get('state_province', '')} {row.get('region_detail', '')}".strip()
                print(f"   {row['slug']:50s} ({location or row['country']})")

if __name__ == "__main__":
    regenerate_slugs('spots_classified_final.csv', 'spots_classified_final.csv')

