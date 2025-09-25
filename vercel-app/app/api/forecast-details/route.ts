import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchWaveWindStats, type SpotInfo } from '@/lib/openmeteo';
import { generateAffiliateUrls } from '@/lib/dateUtils';

export async function POST(request: NextRequest) {
  try {
    // Get both ruleId and alertRule from request body
    const { ruleId, alertRule } = await request.json();
    
    console.log('API: Received request for ruleId:', ruleId);
    console.log('API: Received alertRule:', alertRule);
    
    if (!ruleId) {
      console.error('API: Missing ruleId parameter');
      return NextResponse.json({ error: 'Missing ruleId parameter' }, { status: 400 });
    }
    
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
      console.log('API: No cached forecast data found for spot_id:', alertRule.spot_id);
      console.log('API: Attempting to fetch fresh data from Open-Meteo API...');
      
      // Fallback: Fetch fresh data from Open-Meteo API
      try {
        // Get spot information from database
        const { data: spotData, error: spotError } = await supabase
          .from('spots')
          .select('id, name, latitude, longitude, timezone')
          .eq('id', alertRule.spot_id)
          .single();

        if (spotError || !spotData) {
          console.error('API: Failed to fetch spot data:', spotError);
          return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
        }

        const spot: SpotInfo = {
          id: spotData.id,
          name: spotData.name,
          latitude: spotData.latitude,
          longitude: spotData.longitude,
          timezone: spotData.timezone || 'UTC'
        };

        // Fetch fresh forecast data from Open-Meteo
        const freshForecastData = await fetchWaveWindStats(spot, alertRule.forecast_window || 5);
        
        if (!freshForecastData || freshForecastData.length === 0) {
          console.error('API: Failed to fetch fresh forecast data from Open-Meteo');
          return NextResponse.json({ error: 'No forecast data available' }, { status: 404 });
        }

        console.log(`API: Successfully fetched ${freshForecastData.length} days of fresh forecast data`);
        
        // Process the fresh data using the same logic as cached data
        const isFreshData = true; // This is fresh data from Open-Meteo API
        const processedData = freshForecastData.map(day => {
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
          
          // Apply planning logic (same as quick-forecast-check API)
          const planningLogic = alertRule.planning_logic || 'conservative';
          let waveOk: boolean;
          let windOk: boolean;
          
          switch (planningLogic) {
            case 'optimistic':
              waveOk = avgWave >= waveMin && avgWave <= waveMax;
              windOk = avgWind <= windMax;
              break;
            case 'aggressive':
              waveOk = minWave >= waveMin && minWave <= waveMax;
              windOk = avgWind <= windMax;
              break;
            case 'conservative':
            default:
              waveOk = avgWave >= waveMin && avgWave <= waveMax;
              windOk = maxWind <= windMax;
              break;
          }
          
          // For fresh data, assume morning conditions are good since we don't have morning data
const morningOk = isFreshData ? true : (day.morning_ok || false);
          
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

        console.log('API: Successfully processed fresh forecast data, returning response with disclaimer');
        return NextResponse.json({
          ruleId,
          cachedAt: null, // No cache timestamp for fresh data
          forecastWindow: alertRule.forecast_window,
          criteria: {
            waveMin: alertRule.wave_min_m,
            waveMax: alertRule.wave_max_m,
            windMax: alertRule.wind_max_kmh
          },
          days: processedData,
          isFreshData: true, // Flag to indicate this is fresh data
          disclaimer: 'Fresh data from Open-Meteo API. May not represent optimal morning conditions. We\'ll refresh with morning data and send alerts if conditions match.'
        });

      } catch (error) {
        console.error('API: Error fetching fresh forecast data:', error);
        return NextResponse.json({ error: 'Failed to fetch forecast data' }, { status: 500 });
      }
    }

    // Get forecast days for the forecast window (today + forecast_window days)
    const cachedAt = forecastData[0].cached_at;
    const forecastWindow = alertRule.forecast_window || 5;
    
    // Calculate the forecast window dates (exactly forecast_window days)
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + forecastWindow - 1); // exactly forecast_window days
    
    const todayStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`API: Fetching forecast days for window: ${todayStr} to ${endDateStr} (${forecastWindow} days inclusive)`);
    
    const { data: allForecastData, error: allForecastError } = await supabase
      .from('forecast_cache')
      .select('date, wave_stats, wind_stats, morning_ok')
      .eq('spot_id', alertRule.spot_id)
      .eq('cached_at', cachedAt)
      .gte('date', todayStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    console.log('API: All forecast query result:', { allForecastData, allForecastError });

    if (allForecastError) {
      console.error('API: All forecast query error:', allForecastError);
      return NextResponse.json({ error: 'Failed to fetch all forecast data' }, { status: 500 });
    }

    // Check if we have enough days in the cached data
    if (!allForecastData || allForecastData.length < forecastWindow) {
      console.log(`API: Cached data has ${allForecastData?.length || 0} days, but need ${forecastWindow} days. Fetching fresh data...`);
      
      // Fallback: Fetch fresh data from Open-Meteo API
      try {
        // Get spot information from database
        const { data: spotData, error: spotError } = await supabase
          .from('spots')
          .select('id, name, latitude, longitude, timezone')
          .eq('id', alertRule.spot_id)
          .single();

        if (spotError || !spotData) {
          console.error('API: Failed to fetch spot data:', spotError);
          return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
        }

        const spot: SpotInfo = {
          id: spotData.id,
          name: spotData.name,
          latitude: spotData.latitude,
          longitude: spotData.longitude,
          timezone: spotData.timezone || 'UTC'
        };

        // Fetch fresh forecast data from Open-Meteo
        const freshForecastData = await fetchWaveWindStats(spot, forecastWindow);
        
        if (!freshForecastData || freshForecastData.length === 0) {
          console.error('API: Failed to fetch fresh forecast data from Open-Meteo');
          return NextResponse.json({ error: 'No forecast data available' }, { status: 404 });
        }

        console.log(`API: Successfully fetched ${freshForecastData.length} days of fresh forecast data`);
        
        // Process the fresh data using the same logic as cached data
        const isFreshData = true; // This is fresh data from Open-Meteo API
        const processedData = freshForecastData.map(day => {
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
          
          // Apply planning logic (same as quick-forecast-check API)
          const planningLogic = alertRule.planning_logic || 'conservative';
          let waveOk: boolean;
          let windOk: boolean;
          
          switch (planningLogic) {
            case 'optimistic':
              waveOk = avgWave >= waveMin && avgWave <= waveMax;
              windOk = avgWind <= windMax;
              break;
            case 'aggressive':
              waveOk = minWave >= waveMin && minWave <= waveMax;
              windOk = avgWind <= windMax;
              break;
            case 'conservative':
            default:
              waveOk = avgWave >= waveMin && avgWave <= waveMax;
              windOk = maxWind <= windMax;
              break;
          }
          
          // For fresh data, assume morning conditions are good since we don't have morning data
const morningOk = isFreshData ? true : (day.morning_ok || false);
          
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

        console.log('API: Successfully processed fresh forecast data, returning response with disclaimer');
        return NextResponse.json({
          ruleId,
          cachedAt: null, // No cache timestamp for fresh data
          forecastWindow: alertRule.forecast_window,
          criteria: {
            waveMin: alertRule.wave_min_m,
            waveMax: alertRule.wave_max_m,
            windMax: alertRule.wind_max_kmh
          },
          days: processedData,
          isFreshData: true, // Flag to indicate this is fresh data
          disclaimer: 'Fresh data from Open-Meteo API. May not represent optimal morning conditions. We\'ll refresh with morning data and send alerts if conditions match.'
        });

      } catch (error) {
        console.error('API: Error fetching fresh forecast data:', error);
        return NextResponse.json({ error: 'Failed to fetch forecast data' }, { status: 500 });
      }
    }

    // Process the forecast data and limit to forecast window
    const isFreshData = false; // This is cached data
    const processedData = allForecastData.slice(0, forecastWindow).map(day => {
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
      // For fresh data, assume morning conditions are good since we don't have morning data
const morningOk = isFreshData ? true : (day.morning_ok || false);
      
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
