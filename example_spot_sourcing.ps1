# Example workflow for sourcing surf spots (Windows PowerShell)

Write-Host "🌊 TideFly Spot Sourcing Agent - Example Workflow" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pip install -r spot_agent_requirements.txt
Write-Host ""

# Quick test with 10 spots (no LLM)
Write-Host "🧪 TEST: Sourcing 10 European spots (FREE, ~2 minutes)..." -ForegroundColor Green
python spot_sourcing_agent.py --region europe --limit 10 --output test_spots.csv
Write-Host ""

# Optional: Full European collection
Write-Host "🇪🇺 Sourcing 200 European spots (FREE, ~20-30 minutes)..." -ForegroundColor Green
python spot_sourcing_agent.py --region europe --limit 200 --output spots_europe.csv
Write-Host ""

# Optional: With LLM enrichment (requires API key)
# Uncomment the lines below if you have an Anthropic API key
# Write-Host "✨ Enriching 50 European spots with LLM (~$0.50, ~10 minutes)..." -ForegroundColor Magenta
# $env:ANTHROPIC_API_KEY = "your-key-here"
# python spot_sourcing_agent.py --region europe --limit 50 --enrich --output spots_europe_enriched.csv
# Write-Host ""

Write-Host "✅ Done! Check the generated CSV files." -ForegroundColor Green
Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Review the CSV files"
Write-Host "   2. Import to Supabase"
Write-Host "   3. Validate with OpenMeteo API"


