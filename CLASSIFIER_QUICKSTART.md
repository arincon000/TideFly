# 🌊 Spot Classifier - Quick Start

## 🚀 Run the Classifier

### **Option 1: Quick Test (10 spots, ~$0.0002, 30 seconds)**
```powershell
python spot_classifier.py --api-key YOUR_OPENAI_API_KEY --limit 10 --output spots_test.csv
```

### **Option 2: Full Run (5,980 spots, ~$0.08, 10-15 minutes)**
```powershell
python spot_classifier.py --api-key YOUR_OPENAI_API_KEY --output spots_classified_full.csv
```

---

## 📊 What It Does

1. ✅ Downloads 5,980 surf spots from GitHub Gist
2. ✅ Classifies each spot as `beginner`, `intermediate`, or `advanced` using GPT-4o-mini
3. ✅ Finds nearest airport (IATA code) within 300km
4. ✅ Gets timezone for each spot
5. ✅ Maps country → region (Europe, Asia, etc.)
6. ✅ Exports TideFly-ready CSV

---

## 📁 Output CSV Format

```csv
name,country,latitude,longitude,timezone,skill_level,primary_airport_iata,region_major,slug,active
Biarritz - Côte des Basques,France,43.476,-1.569,Europe/Paris,beginner,BIQ,Europe,biarritz-cote-des-basques,true
Nazaré - Praia do Norte,Portugal,39.605,-9.078,Europe/Lisbon,advanced,LIS,Europe,nazare-praia-do-norte,true
```

---

## 🔑 Get Your OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-...`)
4. Use it in the command above

---

## ⚠️ Important Notes

- The script will download `airports.csv` automatically if not present
- Processing happens in batches of 50 spots
- Progress is shown in real-time
- Cost is charged to your OpenAI account

---

## 📊 Expected Output

```
============================================================
🌊 TideFly Surf Spot Classifier (GPT-4o-mini)
============================================================

🌊 Fetching spots from GitHub Gist...
✅ Fetched 5980 surf spots
✅ Loaded 67894 airports

🔄 Processing 5980 spots...
📊 Batch size: 50 spots per API call
⏱️  Estimated time: 4.0 minutes

[Batch 1/120] Classifying spots 1-50...
   [1/5980] 's-Gravenzande → beginner
   [2/5980] 't Zwin → beginner
   ...
```

---

Ready to go! 🏄‍♂️

