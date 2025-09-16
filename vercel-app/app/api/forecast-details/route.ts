import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');
    
    console.log('API: Received request for ruleId:', ruleId);
    
    if (!ruleId) {
      console.error('API: Missing ruleId parameter');
      return NextResponse.json({ error: 'Missing ruleId parameter' }, { status: 400 });
    }

    // Get alert rule data from request body
    const alertRule = await request.json();
    console.log('API: Received alertRule:', alertRule);
    
    if (!alertRule.spot_id) {
      console.error('API: No spot_id in alertRule');
      return NextResponse.json({ error: 'No spot associated with this alert' }, { status: 400 });
    }

    // Create Supabase client with anon key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    console.log('API: Created Supabase client, fetching forecast data for spot_id:', alertRule.spot_id);

    // Get the most recent forecast data for this spot
    const { data: forecastData, error: forecastError } = await supabase
      .from('forecast_cache')
      .select('date, wave_stats, wind_stats, cached_at')
      .eq('spot_id', alertRule.spot_id)
      .order('cached_at', { ascending: false })
      .limit(1);

    console.log('API: Forecast query result:', { forecastData, forecastError });

    if (forecastError) {
      console.error('API: Forecast query error:', forecastError);
      return NextResponse.json({ error: 'Failed to fetch forecast data' }, { status: 500 });
    }

    if (!forecastData || forecastData.length === 0) {
      console.error('API: No forecast data found for spot_id:', alertRule.spot_id);
      return NextResponse.json({ error: 'No forecast data available' }, { status: 404 });
    }

    // Get all forecast days for this cached snapshot
    const cachedAt = forecastData[0].cached_at;
    console.log('API: Fetching all forecast days for cached_at:', cachedAt);
    
    const { data: allForecastData, error: allForecastError } = await supabase
      .from('forecast_cache')
      .select('date, wave_stats, wind_stats, morning_ok')
      .eq('spot_id', alertRule.spot_id)
      .eq('cached_at', cachedAt)
      .order('date', { ascending: true });

    console.log('API: All forecast query result:', { allForecastData, allForecastError });

    if (allForecastError) {
      console.error('API: All forecast query error:', allForecastError);
      return NextResponse.json({ error: 'Failed to fetch all forecast data' }, { status: 500 });
    }

    // Process the forecast data
    const processedData = allForecastData.map(day => {
      const waveStats = day.wave_stats || {};
      const windStats = day.wind_stats || {};
      
      // Check if this day meets the alert criteria
      const waveMin = alertRule.wave_min_m || 0;
      const waveMax = alertRule.wave_max_m || 100;
      const windMax = alertRule.wind_max_kmh || 100;
      
      const avgWave = waveStats.avg || 0;
      const maxWave = waveStats.max || 0;
      const minWave = waveStats.min || 0;
      const avgWind = windStats.avg || 0;
      const maxWind = windStats.max || 0;
      const minWind = windStats.min || 0;
      
      // Use avg for waves, max for wind (as per recommendation)
      const waveOk = avgWave >= waveMin && avgWave <= waveMax;
      const windOk = maxWind <= windMax;
      const morningOk = day.morning_ok || false;
      
      // Check if conditions fall below minimum ranges
      const waveBelowMin = avgWave < waveMin;
      const windAboveMax = maxWind > windMax;
      
      return {
        date: day.date,
        wave: {
          min: minWave,
          max: maxWave,
          avg: avgWave,
          ok: waveOk,
          belowMin: waveBelowMin
        },
        wind: {
          min: minWind,
          max: maxWind,
          avg: avgWind,
          ok: windOk,
          aboveMax: windAboveMax
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

    console.log('API: Successfully processed forecast data, returning response');
    return NextResponse.json({
      ruleId,
      cachedAt,
      forecastWindow: alertRule.forecast_window,
      criteria: {
        waveMin: alertRule.wave_min_m,
        waveMax: alertRule.wave_max_m,
        windMax: alertRule.wind_max_kmh
      },
      days: processedData
    });

  } catch (error) {
    console.error('API: Uncaught error in forecast-details API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
