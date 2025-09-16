import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');
    
    if (!ruleId) {
      return NextResponse.json({ error: 'Missing ruleId parameter' }, { status: 400 });
    }

    // Get the alert rule to find the spot_id
    const { data: rule, error: ruleError } = await supabase
      .from('alert_rules')
      .select('spot_id, wave_min_m, wave_max_m, wind_max_kmh, forecast_window')
      .eq('id', ruleId)
      .single();

    if (ruleError || !rule) {
      return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });
    }

    if (!rule.spot_id) {
      return NextResponse.json({ error: 'No spot associated with this alert' }, { status: 400 });
    }

    // Get the most recent forecast data for this spot
    const { data: forecastData, error: forecastError } = await supabase
      .from('forecast_cache')
      .select('date, wave_stats, wind_stats, cached_at')
      .eq('spot_id', rule.spot_id)
      .order('cached_at', { ascending: false })
      .limit(1);

    if (forecastError) {
      console.error('Forecast query error:', forecastError);
      return NextResponse.json({ error: 'Failed to fetch forecast data' }, { status: 500 });
    }

    if (!forecastData || forecastData.length === 0) {
      return NextResponse.json({ error: 'No forecast data available' }, { status: 404 });
    }

    // Get all forecast days for this cached snapshot
    const cachedAt = forecastData[0].cached_at;
    const { data: allForecastData, error: allForecastError } = await supabase
      .from('forecast_cache')
      .select('date, wave_stats, wind_stats, morning_ok')
      .eq('spot_id', rule.spot_id)
      .eq('cached_at', cachedAt)
      .order('date', { ascending: true });

    if (allForecastError) {
      console.error('All forecast query error:', allForecastError);
      return NextResponse.json({ error: 'Failed to fetch all forecast data' }, { status: 500 });
    }

    // Process the forecast data
    const processedData = allForecastData.map(day => {
      const waveStats = day.wave_stats || {};
      const windStats = day.wind_stats || {};
      
      // Check if this day meets the alert criteria
      const waveMin = rule.wave_min_m || 0;
      const waveMax = rule.wave_max_m || 100;
      const windMax = rule.wind_max_kmh || 100;
      
      const avgWave = waveStats.avg || 0;
      const maxWave = waveStats.max || 0;
      const avgWind = windStats.avg || 0;
      const maxWind = windStats.max || 0;
      
      const waveOk = avgWave >= waveMin && maxWave <= waveMax;
      const windOk = maxWind <= windMax;
      const morningOk = day.morning_ok || false;
      
      return {
        date: day.date,
        wave: {
          min: waveStats.min || 0,
          max: waveStats.max || 0,
          avg: waveStats.avg || 0,
          ok: waveOk
        },
        wind: {
          min: windStats.min || 0,
          max: windStats.max || 0,
          avg: windStats.avg || 0,
          ok: windOk
        },
        morningOk,
        overallOk: waveOk && windOk && morningOk,
        criteria: {
          waveMin,
          waveMax,
          windMax
        }
      };
    });

    return NextResponse.json({
      ruleId,
      cachedAt,
      forecastWindow: rule.forecast_window,
      criteria: {
        waveMin: rule.wave_min_m,
        waveMax: rule.wave_max_m,
        windMax: rule.wind_max_kmh
      },
      days: processedData
    });

  } catch (error) {
    console.error('Forecast details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
