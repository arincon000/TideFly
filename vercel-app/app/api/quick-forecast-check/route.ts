import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface QuickForecastCheckRequest {
  ruleId: string;
  alertRule: {
    spot_id: string | null;
    wave_min_m: number | null;
    wave_max_m: number | null;
    wind_max_kmh: number | null;
    forecast_window: number | null;
    planning_logic?: string;
  };
}

interface QuickForecastResult {
  conditionsGood: boolean;
  priceDataAvailable: boolean;
  priceFreshness: 'fresh' | 'stale' | 'none';
  shouldTriggerWorker: boolean;
  forecastSummary: {
    goodDays: number;
    totalDays: number;
    bestDay?: string;
  };
  priceData?: {
    price: number | null;
    affiliateLink: string | null;
    cachedAt: string | null;
    warning?: string;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { ruleId, alertRule }: QuickForecastCheckRequest = await request.json();
    
    console.log('Quick Check: Processing ruleId:', ruleId);
    console.log('Quick Check: Alert rule:', alertRule);
    
    if (!alertRule.spot_id) {
      return NextResponse.json({ 
        error: 'No spot associated with this alert' 
      }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Step 1: Check forecast conditions (FREE - using cached data)
    const forecastResult = await checkForecastConditions(supabase, alertRule);
    console.log('Quick Check: Forecast result:', forecastResult);

    // Step 2: Check price data availability and freshness
    const priceResult = await checkPriceData(supabase, alertRule);
    console.log('Quick Check: Price result:', priceResult);

    // Step 3: Determine if worker should be triggered
    const shouldTriggerWorker = forecastResult.conditionsGood && 
      (priceResult.freshness === 'stale' || priceResult.freshness === 'none');

    const result: QuickForecastResult = {
      conditionsGood: forecastResult.conditionsGood,
      priceDataAvailable: priceResult.freshness !== 'none',
      priceFreshness: priceResult.freshness,
      shouldTriggerWorker,
      forecastSummary: forecastResult.summary,
      priceData: priceResult.price !== null ? {
        price: priceResult.price,
        affiliateLink: priceResult.affiliateLink,
        cachedAt: priceResult.cachedAt,
        warning: priceResult.warning
      } : undefined
    };

    const duration = Date.now() - startTime;
    console.log('Quick Check: Final result:', result);
    console.log(`Quick Check: Completed in ${duration}ms (FREE API calls only)`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Quick Check: Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function checkForecastConditions(supabase: any, alertRule: any) {
  // Get the most recent forecast data for this spot
  const { data: forecastData, error: forecastError } = await supabase
    .from('forecast_cache')
    .select('date, wave_stats, wind_stats, morning_ok, cached_at')
    .eq('spot_id', alertRule.spot_id)
    .order('cached_at', { ascending: false })
    .limit(1);

  if (forecastError || !forecastData || forecastData.length === 0) {
    return {
      conditionsGood: false,
      summary: { goodDays: 0, totalDays: 0 }
    };
  }

  // Get forecast days for the specified window (today + forecast_window days)
  const cachedAt = forecastData[0].cached_at;
  const forecastWindow = alertRule.forecast_window || 5;
  
  // Calculate the forecast window dates (exactly forecast_window days)
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + forecastWindow - 1); // exactly forecast_window days
  
  const todayStr = today.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  console.log(`Quick Check: Fetching forecast days for window: ${todayStr} to ${endDateStr} (${forecastWindow} days inclusive)`);
  
  const { data: allForecastData, error: allForecastError } = await supabase
    .from('forecast_cache')
    .select('date, wave_stats, wind_stats, morning_ok')
    .eq('spot_id', alertRule.spot_id)
    .eq('cached_at', cachedAt)
    .gte('date', todayStr)
    .lte('date', endDateStr)
    .order('date', { ascending: true });

  if (allForecastError || !allForecastData) {
    return {
      conditionsGood: false,
      summary: { goodDays: 0, totalDays: 0 }
    };
  }

  // Check if we have enough days in the cached data
  if (allForecastData.length < forecastWindow) {
    console.log(`Quick Check: Cached data has ${allForecastData.length} days, but need ${forecastWindow} days. Fetching fresh data...`);
    
    // Fallback: Fetch fresh data from Open-Meteo API (same logic as forecast-details API)
    try {
      // Get spot information from database
      const { data: spotData, error: spotError } = await supabase
        .from('spots')
        .select('id, name, latitude, longitude, timezone')
        .eq('id', alertRule.spot_id)
        .single();

      if (spotError || !spotData) {
        console.error('Quick Check: Failed to fetch spot data:', spotError);
        return {
          conditionsGood: false,
          summary: { goodDays: 0, totalDays: 0 }
        };
      }

      // Import the Open-Meteo function
      const { fetchWaveWindStats } = await import('@/lib/openmeteo');
      
      const spot = {
        id: spotData.id,
        name: spotData.name,
        latitude: spotData.latitude,
        longitude: spotData.longitude,
        timezone: spotData.timezone || 'UTC'
      };

      // Fetch fresh forecast data from Open-Meteo
      const freshForecastData = await fetchWaveWindStats(spot, forecastWindow);
      
      if (!freshForecastData || freshForecastData.length === 0) {
        console.error('Quick Check: Failed to fetch fresh forecast data from Open-Meteo');
        return {
          conditionsGood: false,
          summary: { goodDays: 0, totalDays: 0 }
        };
      }

      console.log(`Quick Check: Successfully fetched ${freshForecastData.length} days of fresh forecast data`);
      
      // Process the fresh data using the same logic as cached data
      const isFreshData = true; // This is fresh data from Open-Meteo API
      const planningLogic = alertRule.planning_logic || 'conservative';
      let goodDays = 0;
      let bestDay: string | undefined;

      for (const day of freshForecastData) {
        const waveStats = day.wave_stats || {};
        const windStats = day.wind_stats || {};
        
        const waveMin = alertRule.wave_min_m || 0;
        const waveMax = alertRule.wave_max_m || 100;
        const windMax = alertRule.wind_max_kmh || 100;
        
        // Apply planning logic (same as cached data logic)
        let waveOk: boolean;
        let windOk: boolean;
        
        switch (planningLogic) {
          case 'optimistic':
            waveOk = (waveStats.avg || 0) >= waveMin && (waveStats.avg || 0) <= waveMax;
            windOk = (windStats.avg || 0) <= windMax;
            break;
          case 'aggressive':
            waveOk = (waveStats.min || 0) >= waveMin && (waveStats.min || 0) <= waveMax;
            windOk = (windStats.avg || 0) <= windMax;
            break;
          case 'conservative':
          default:
            waveOk = (waveStats.avg || 0) >= waveMin && (waveStats.avg || 0) <= waveMax;
            windOk = (windStats.max || 0) <= windMax;
            break;
        }
        
        // For fresh data, assume morning conditions are good since we don't have morning data
        const morningOk = isFreshData ? true : (day.morning_ok || false);
        const overallOk = waveOk && windOk && morningOk;
        
        if (overallOk) {
          goodDays++;
          if (!bestDay) bestDay = day.date;
        }
      }

      return {
        conditionsGood: goodDays > 0,
        summary: {
          goodDays,
          totalDays: freshForecastData.length,
          bestDay
        }
      };

    } catch (error) {
      console.error('Quick Check: Error fetching fresh forecast data:', error);
      // Fall back to using whatever cached data we have
      console.log('Quick Check: Falling back to cached data due to fresh data fetch error');
    }
  }

  // Apply planning logic
  const isFreshData = false; // This is cached data
  const planningLogic = alertRule.planning_logic || 'conservative';
  let goodDays = 0;
  let bestDay: string | undefined;

  for (const day of allForecastData) {
    const waveStats = day.wave_stats || {};
    const windStats = day.wind_stats || {};
    
    const waveMin = alertRule.wave_min_m || 0;
    const waveMax = alertRule.wave_max_m || 100;
    const windMax = alertRule.wind_max_kmh || 100;
    
    // Apply planning logic
    let waveOk: boolean;
    let windOk: boolean;
    
    switch (planningLogic) {
      case 'optimistic':
        waveOk = (waveStats.avg || 0) >= waveMin && (waveStats.avg || 0) <= waveMax;
        windOk = (windStats.avg || 0) <= windMax;
        break;
      case 'aggressive':
        waveOk = (waveStats.min || 0) >= waveMin && (waveStats.min || 0) <= waveMax;
        windOk = (windStats.avg || 0) <= windMax;
        break;
      case 'conservative':
      default:
        waveOk = (waveStats.avg || 0) >= waveMin && (waveStats.avg || 0) <= waveMax;
        windOk = (windStats.max || 0) <= windMax;
        break;
    }
    
    // For fresh data, assume morning conditions are good since we don't have morning data
    const morningOk = isFreshData ? true : (day.morning_ok || false);
    const overallOk = waveOk && windOk && morningOk;
    
    if (overallOk) {
      goodDays++;
      if (!bestDay) bestDay = day.date;
    }
  }

  return {
    conditionsGood: goodDays > 0,
    summary: {
      goodDays,
      totalDays: allForecastData.length,
      bestDay
    }
  };
}

async function checkPriceData(supabase: any, alertRule: any) {
  try {
    // Get the most recent price data for this spot
    const { data: priceData, error: priceError } = await supabase
      .from('price_cache')
      .select('price_eur, affiliate_link, cached_at, expires_at')
      .eq('spot_id', alertRule.spot_id)
      .order('cached_at', { ascending: false })
      .limit(1);

    if (priceError || !priceData || priceData.length === 0) {
      return {
        freshness: 'none' as const,
        price: null,
        affiliateLink: null,
        cachedAt: null,
        warning: 'No price data available - worker will run soon'
      };
    }

    const price = priceData[0];
    const cachedAt = new Date(price.cached_at);
    const expiresAt = new Date(price.expires_at);
    const now = new Date();
    const hoursAgo = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);

    // Determine freshness
    let freshness: 'fresh' | 'stale' | 'none';
    let warning: string | undefined;

    if (now > expiresAt) {
      freshness = 'none';
      warning = 'Price data expired - worker will run soon';
    } else if (hoursAgo <= 6) {
      freshness = 'fresh';
    } else if (hoursAgo <= 24) {
      freshness = 'stale';
      warning = 'Price data is a few hours old - check current rates';
    } else {
      freshness = 'stale';
      warning = 'Price data is outdated - check current rates';
    }

    return {
      freshness,
      price: price.price_eur,
      affiliateLink: price.affiliate_link,
      cachedAt: price.cached_at,
      warning
    };

  } catch (error) {
    console.error('Quick Check: Price data error:', error);
    return {
      freshness: 'none' as const,
      price: null,
      affiliateLink: null,
      cachedAt: null,
      warning: 'Error checking price data - worker will run soon'
    };
  }
}
