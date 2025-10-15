#!/bin/bash
# Example workflow for sourcing surf spots

echo "🌊 TideFly Spot Sourcing Agent - Example Workflow"
echo "================================================="
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r spot_agent_requirements.txt
echo ""

# Quick test with 10 spots (no LLM)
echo "🧪 TEST: Sourcing 10 European spots (FREE, ~2 minutes)..."
python spot_sourcing_agent.py --region europe --limit 10 --output test_spots.csv
echo ""

# Optional: Full European collection
echo "🇪🇺 Sourcing 200 European spots (FREE, ~20-30 minutes)..."
python spot_sourcing_agent.py --region europe --limit 200 --output spots_europe.csv
echo ""

# Optional: With LLM enrichment (requires API key)
# Uncomment the lines below if you have an Anthropic API key
# echo "✨ Enriching 50 European spots with LLM (~$0.50, ~10 minutes)..."
# export ANTHROPIC_API_KEY="your-key-here"
# python spot_sourcing_agent.py --region europe --limit 50 --enrich --output spots_europe_enriched.csv
# echo ""

echo "✅ Done! Check the generated CSV files."
echo ""
echo "📊 Next steps:"
echo "   1. Review the CSV files"
echo "   2. Import to Supabase"
echo "   3. Validate with OpenMeteo API"



