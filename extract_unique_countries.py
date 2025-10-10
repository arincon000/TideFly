#!/usr/bin/env python3
"""
Extract unique countries from cleaned spots CSV
"""

import csv
from collections import Counter

def extract_unique_countries(input_file):
    """Extract unique countries and count spots per country"""
    
    print(f"🔄 Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"✅ Loaded {len(rows)} spots")
    
    # Count spots per country
    country_counts = Counter()
    country_clean_counts = Counter()
    
    for row in rows:
        country_original = row.get('country', '').strip()
        country_clean = row.get('country_clean', '').strip()
        
        if country_original:
            country_counts[country_original] += 1
        if country_clean:
            country_clean_counts[country_clean] += 1
    
    # Write original country list
    print(f"\n💾 Writing unique_countries_original.txt...")
    with open('unique_countries_original.txt', 'w', encoding='utf-8') as f:
        f.write(f"Total unique country entries: {len(country_counts)}\n")
        f.write(f"Total spots: {sum(country_counts.values())}\n")
        f.write("=" * 80 + "\n\n")
        
        for country, count in sorted(country_counts.items(), key=lambda x: (-x[1], x[0])):
            f.write(f"{count:4d} spots | {country}\n")
    
    # Write cleaned country list
    print(f"💾 Writing unique_countries_clean.txt...")
    with open('unique_countries_clean.txt', 'w', encoding='utf-8') as f:
        f.write(f"Total unique countries (cleaned): {len(country_clean_counts)}\n")
        f.write(f"Total spots: {sum(country_clean_counts.values())}\n")
        f.write("=" * 80 + "\n\n")
        
        for country, count in sorted(country_clean_counts.items(), key=lambda x: (-x[1], x[0])):
            f.write(f"{count:4d} spots | {country}\n")
    
    # Write CSV with country statistics
    print(f"💾 Writing countries_with_stats.csv...")
    with open('countries_with_stats.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Country', 'Spot Count', 'Percentage'])
        
        total = sum(country_clean_counts.values())
        for country, count in sorted(country_clean_counts.items(), key=lambda x: (-x[1], x[0])):
            percentage = (count / total * 100)
            writer.writerow([country, count, f"{percentage:.1f}%"])
    
    print(f"\n✅ Done!")
    print(f"\n📊 Top 10 Countries:")
    for i, (country, count) in enumerate(sorted(country_clean_counts.items(), key=lambda x: -x[1])[:10], 1):
        percentage = (count / sum(country_clean_counts.values()) * 100)
        print(f"   {i:2d}. {country:30s} {count:4d} spots ({percentage:5.1f}%)")

if __name__ == "__main__":
    extract_unique_countries('spots_classified_cleaned.csv')


