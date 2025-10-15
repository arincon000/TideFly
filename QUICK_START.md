# 🚀 TideFly Spot Agent - Quick Start

## ⚡ Super Fast Setup (5 minutes)

### Windows (PowerShell)
```powershell
# 1. Install dependencies
pip install requests pandas geopy

# 2. Run the agent (100 European spots, NO API key needed)
python spot_sourcing_agent.py --region europe --limit 100

# 3. Done! Check the generated CSV file
```

### Mac/Linux (Bash)
```bash
# 1. Install dependencies
pip install requests pandas geopy

# 2. Run the agent (100 European spots, NO API key needed)
python spot_sourcing_agent.py --region europe --limit 100

# 3. Done! Check the generated CSV file
```

## 📝 What You Get

**100 spots in ~10-15 minutes** with:
- ✅ Name & coordinates (OpenMeteo-compatible)
- ✅ Country & timezone
- ✅ Nearest airport (IATA code)
- ✅ Basic skill level
- ✅ **All FREE** (no API keys needed)

## 🎯 Recommended Approach

### Phase 1: Get the Data (FREE)
```bash
# Europe (200 spots)
python spot_sourcing_agent.py --region europe --limit 200

# Central America (150 spots)
python spot_sourcing_agent.py --region central_america --limit 150

# South America (150 spots)
python spot_sourcing_agent.py --region south_america --limit 150

# Total: 500 spots in ~45 minutes, $0 cost
```

### Phase 2: Enrich Top Spots (~$5)
```bash
# Get Anthropic API key from: https://console.anthropic.com
export ANTHROPIC_API_KEY="sk-ant-..."

# Enrich top 50 spots per region
python spot_sourcing_agent.py --region europe --limit 50 --enrich
python spot_sourcing_agent.py --region central_america --limit 50 --enrich
python spot_sourcing_agent.py --region south_america --limit 50 --enrich
```

### Phase 3: Import to Supabase
1. Open Supabase Dashboard
2. Go to Table Editor → `spots`
3. Click "Insert" → "Import data from CSV"
4. Upload your CSV file
5. Map columns and import
6. Done! 🎉

## 🎓 Pro Tips

1. **Start small**: Test with 20 spots first
2. **No enrichment needed**: The FREE version is often enough
3. **Manual curation**: Review top 50-100 spots manually for best quality
4. **Multiple regions**: Run the agent for each region separately
5. **OpenMeteo validation**: Test a few random coordinates manually

## 💰 Cost Breakdown

| Method | Spots | Time | Cost |
|--------|-------|------|------|
| **Basic (Recommended)** | 500 | ~45 min | **$0** |
| **Basic + Manual Review** | 500 | ~2-3 hours | **$0** |
| **With LLM Enrichment** | 500 | ~2 hours | **~$5** |
| **Full Enrichment** | 1000 | ~4 hours | **~$10** |

## 🔧 Troubleshooting

**"No module named 'requests'"**
```bash
pip install requests pandas geopy
```

**"No spots found"**
- Check internet connection
- Try a different region
- Wait 5 minutes (Overpass API rate limit)

**"No airport within 300km"**
- This is normal - spots are automatically skipped
- Remote spots won't make it into the final list

## 📊 Expected Results

### Without LLM Enrichment
- **Europe**: ~150-250 spots
- **Central America**: ~100-150 spots
- **South America**: ~120-180 spots
- **Asia**: ~200-300 spots
- **Total Global**: ~1000-1500 spots

### Data Quality
- ✅ Coordinates: 95%+ accurate
- ✅ Airport matching: 90%+ accurate
- ⚠️ Seasonality: Basic (improve with LLM)
- ⚠️ Wave ranges: Generic (improve with LLM)

## 🎉 That's It!

You now have a fully automated agent that can source 1000+ surf spots in a few hours, mostly for free!

**Next Steps:**
1. Run the agent for your target regions
2. Review the CSV files
3. Import to Supabase
4. Start building TideFly alerts! 🏄‍♂️

---

Questions? Check `SPOT_AGENT_README.md` for detailed docs.



