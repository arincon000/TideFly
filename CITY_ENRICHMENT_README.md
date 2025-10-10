# 🏨 City Enrichment for Surf Spots

This script adds **nearest city** and **Hotellook city ID** data to your surf spots CSV.

## 🎯 What It Does

For each surf spot:
1. **Finds nearest city/town** using OpenStreetMap Nominatim (reverse geocoding)
2. **Finds nearest bookable city** using Hotellook/Travelpayouts API
3. **Adds 5 new columns**:
   - `nearest_city` - Actual nearest city/town from OSM (for display context)
   - `nearest_city_distance_km` - Distance to nearest city (usually 0)
   - `hotellook_city_id` - Numeric ID for Hotellook booking links
   - `hotellook_city_name` - Bookable city name (may be different/larger than nearest_city)
   - `hotellook_city_distance_km` - Distance to bookable city in kilometers

## 📋 Requirements

```bash
pip install requests
```

## 🚀 Usage

### Test with 10 spots first:
```powershell
python add_nearest_city.py --input spots_classified_final.csv --output spots_with_cities_test.csv --limit 10
```

### Process all 5,890 spots:
```powershell
python add_nearest_city.py --input spots_classified_final.csv --output spots_with_cities.csv
```

### Resume from progress file (if script crashes):
```powershell
# The script auto-saves progress every 50 spots
# Just re-run and it will use the cache
python add_nearest_city.py
```

## ⏱️ Expected Time

- **Rate limits**: OSM Nominatim = 1 request/second
- **Estimated time**: ~3-4 hours for 5,890 spots (2 API calls per spot)
- **Progress saving**: Every 50 spots (prevents data loss)

## 📊 Output Format

The output CSV will have all original columns plus:

```csv
name,latitude,longitude,nearest_city,nearest_city_distance_km,hotellook_city_id,hotellook_city_name,hotellook_city_distance_km
Nazaré - Praia do Norte,39.605,-9.078,Nazaré,0,4845,Nazare,0.0
13th beach,-38.285355,144.461632,City of Greater Geelong,0,,Geelong,15.3
```

**Example scenarios:**
- **Same city**: Nazaré is both the nearest town AND has hotels in Hotellook
- **Different city**: Spot is in a small town (City of Greater Geelong), but nearest bookable city is Geelong (15.3km away)

## 🔗 Generating Hotellook Booking Links

Once you have the `hotellook_city_id` and `hotellook_city_name`, generate booking URLs like:

```javascript
// Use hotellook_city_id and hotellook_city_name for booking
const hotelUrl = `https://search.hotellook.com/hotels?` +
  `cityId=${spot.hotellook_city_id}&` +
  `destination=${encodeURIComponent(spot.hotellook_city_name)}&` +
  `checkIn=${checkInDate}&` +
  `checkOut=${checkOutDate}&` +
  `adults=1&` +
  `currency=usd&` +
  `language=en&` +
  `marker=YOUR_AFFILIATE_ID`;

// Display context to user
const displayText = spot.nearest_city === spot.hotellook_city_name
  ? `Stay in ${spot.nearest_city}`
  : `Stay in ${spot.hotellook_city_name} (${spot.hotellook_city_distance_km}km from ${spot.nearest_city})`;
```

## ⚠️ Known Limitations

1. **OSM Rate Limit**: Script respects 1 req/sec limit (takes time)
2. **City Match Accuracy**: Some spots may be far from cities (remote beaches)
3. **Hotellook Coverage**: Not all cities have hotels in Hotellook database
4. **Country Code Matching**: Uses country code for better Hotellook matching

## 🧪 Testing Strategy

1. **Run with `--limit 10`** first to verify output format
2. **Check a few well-known spots** (e.g., Nazaré, Biarritz) for accuracy
3. **Run full dataset** if test results look good
4. **Review statistics** at the end (% with city data)

## 💡 Alternative Approaches

If OSM rate limits are too slow, you could:

1. **Use GeoNames database** (download cities15000.txt, ~25k cities with pop > 15k)
   - Calculate distances locally using Haversine formula
   - Much faster (no API calls for step 1)
   - Trade-off: Less accurate for small towns

2. **Batch process** in chunks over multiple days

3. **Pay for commercial geocoding API** (Google, Mapbox) with higher rate limits

