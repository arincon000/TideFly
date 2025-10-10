# 🌊 Get Ocean Surf Spots Only (NOT Schools/Shops)

The agent has been updated with **smart filters** that:
- ✅ Filters out surf schools/shops/businesses
- ✅ Only fetches real surf breaks and beaches
- ✅ Checks for real ocean wave data using OpenMeteo Marine API
- ✅ Filters out river surfing spots (Eisbach, Almwelle, etc.)
- ✅ Only keeps spots with average waves > 0.3m

---

## 🚀 PowerShell Commands

### Quick Test (10-20 spots, ~3-5 minutes)
```powershell
cd C:\Users\57320\Desktop\TideFly
python spot_sourcing_agent.py --region europe --limit 30 --output ocean_spots_test.csv
```

### Europe Coastal (50-100 spots, ~15-20 minutes)
```powershell
cd C:\Users\57320\Desktop\TideFly
python spot_sourcing_agent.py --region europe --limit 100 --output ocean_spots_europe.csv
```

### Central America (50-80 spots, ~15 minutes)
```powershell
cd C:\Users\57320\Desktop\TideFly
python spot_sourcing_agent.py --region central_america --limit 80 --output ocean_spots_central_america.csv
```

### South America (50-80 spots, ~15 minutes)
```powershell
cd C:\Users\57320\Desktop\TideFly
python spot_sourcing_agent.py --region south_america --limit 80 --output ocean_spots_south_america.csv
```

### Full Collection (200-300 spots, ~45-60 minutes)
```powershell
cd C:\Users\57320\Desktop\TideFly
python spot_sourcing_agent.py --region europe --limit 150 --output ocean_spots_europe.csv
python spot_sourcing_agent.py --region central_america --limit 100 --output ocean_spots_central_america.csv
python spot_sourcing_agent.py --region south_america --limit 100 --output ocean_spots_south_america.csv
```

---

## 📊 Expected Results

### With Ocean Filter:
- **Europe**: ~30-60 ocean spots (Portugal, Spain, France, UK, Canary Islands)
- **Central America**: ~40-70 ocean spots (Mexico, Costa Rica, Nicaragua, Panama)
- **South America**: ~50-80 ocean spots (Brazil, Peru, Chile, Ecuador)
- **Total**: ~150-250 **real ocean surf spots**

### Filter Behavior:
- ❌ **Skipped**: "Tramore Surf Shop And School" (business)
- ❌ **Skipped**: "Oceanics Surf School" (business)
- ❌ **Skipped**: "Eisbach Munich" (river wave)
- ❌ **Skipped**: "Almwelle Austria" (river wave)
- ✅ **Kept**: "Biarritz - Côte des Basques" (real spot)
- ✅ **Kept**: "Ericeira - Ribeira d'Ilhas" (real spot)
- ✅ **Kept**: "Nazaré - Praia do Norte" (real spot)

---

## 🔧 How the Filter Works

1. **Query OSM**: Get beaches with `surfing=yes` and named surf spots
2. **Business Filter** (NEW):
   - Check name for keywords: "school", "shop", "club", etc.
   - Skip if it's a business ❌
3. **Airport Check**: Skip if no airport within 300km
4. **Ocean Check**:
   - Query OpenMeteo Marine API for wave data
   - Check for waves > 0.1m in at least 5 hours
   - Check average wave height > 0.3m
   - If YES → Ocean spot ✅
   - If NO → River/lake spot, skip ❌
5. **Geocode**: Get country & timezone
6. **Export**: Save to CSV

---

## 💡 Pro Tips

1. **Start Small**: Run with `--limit 30` first to test (3-5 minutes)
2. **Be Patient**: Ocean checking adds ~10 seconds per spot
3. **Expect Skips**: Many spots will be filtered out (that's good!)
4. **Check Output**: Review the CSV to ensure quality
5. **Regional Focus**: Europe gives best results (Portugal, Spain, France)

---

## 📝 Example Output

```
🌊 Fetching surf spots from OpenStreetMap (europe)...
   Querying Overpass API...
✅ Found 50 spots from OSM

📊 Processing 50 spots...

[1/50] Processing: Biarritz - Côte des Basques
   → Geocoding...
   → Finding nearest airport...
   → Checking if ocean spot...
   ✅ Biarritz - Côte des Basques → BIQ (France)

[2/50] Processing: Tramore Surf School
   ⚠️  Surf school/shop (not a surf spot), skipping...

[3/50] Processing: Eisbach
   → Geocoding...
   → Finding nearest airport...
   → Checking if ocean spot...
   ⚠️  Not an ocean spot (likely river/lake), skipping...

[3/50] Processing: Ericeira - Ribeira d'Ilhas
   → Geocoding...
   → Finding nearest airport...
   → Checking if ocean spot...
   ✅ Ericeira - Ribeira d'Ilhas → LIS (Portugal)

...

✅ Successfully processed 28 spots (22 filtered out)
💾 Exporting to ocean_spots_europe_20251004_183604.csv...
✅ Exported 28 spots to ocean_spots_europe_20251004_183604.csv

🎉 Done! 28 spots ready for Supabase import
```

---

## ✅ Ready to Run!

Copy and paste one of the commands above into PowerShell and let it run!

**Recommended first command**:
```powershell
cd C:\Users\57320\Desktop\TideFly; python spot_sourcing_agent.py --region europe --limit 30 --output ocean_spots_test.csv
```

Then check the CSV file to verify the quality before running larger batches. 🏄‍♂️

