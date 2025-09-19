import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAffiliateUrls } from '@/lib/dateUtils';

interface QuickForecastCheckRequest {
  ruleId: string;
  alertRule: {
    spot_id: string | null;
    origin_iata?: string | null;
    dest_iata?: string | null;
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
    hotelLink: string | null;
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
    const priceResult = await checkPriceData(supabase, alertRule, ruleId);
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
      priceData: priceResult.freshness !== 'none' ? {
        price: priceResult.price,
        affiliateLink: priceResult.affiliateLink,
        hotelLink: priceResult.hotelLink,
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
    console.log(`Quick Check: Cached data has ${allForecastData.length} days, but need ${forecastWindow} days. Using cached data for now.`);
    // For quick check, we'll use whatever data we have rather than fetching fresh data
    // This keeps the quick check fast and free
  }

  // Apply planning logic
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
    
    const morningOk = day.morning_ok || false;
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

async function checkPriceData(supabase: any, alertRule: any, ruleId: string) {
  try {
    // Get the most recent price data for this spot
    const { data: priceData, error: priceError } = await supabase
      .from('price_cache')
      .select('price_eur, affiliate_link, hotel_link, cached_at, expires_at')
      .eq('spot_id', alertRule.spot_id)
      .order('cached_at', { ascending: false })
      .limit(1);

    if (priceError || !priceData || priceData.length === 0) {
      return {
        freshness: 'none' as const,
        price: null,
        affiliateLink: null,
        hotelLink: null,
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

    // Generate fresh affiliate links using unified date logic if we have airport codes
    let affiliateLink = price.affiliate_link;
    let hotelLink = price.hotel_link;
    
    if (alertRule.origin_iata && alertRule.dest_iata) {
      try {
        // Get current forecast data to generate fresh affiliate links
        const { data: forecastData } = await supabase
          .from('forecast_cache')
          .select('date, wave_stats, wind_stats, morning_ok, cached_at')
          .eq('spot_id', alertRule.spot_id)
          .order('cached_at', { ascending: false })
          .limit(1);

        if (forecastData && forecastData.length > 0) {
          const cachedAt = forecastData[0].cached_at;
          const forecastWindow = alertRule.forecast_window || 5;
          
          // Calculate the forecast window dates
          const today = new Date();
          const endDate = new Date(today);
          endDate.setDate(today.getDate() + forecastWindow - 1);
          
          const todayStr = today.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];
          
          const { data: allForecastData } = await supabase
            .from('forecast_cache')
            .select('date, wave_stats, wind_stats, morning_ok')
            .eq('spot_id', alertRule.spot_id)
            .eq('cached_at', cachedAt)
            .gte('date', todayStr)
            .lte('date', endDateStr)
            .order('date', { ascending: true });

          if (allForecastData) {
            // Find good days using the same logic as checkForecastConditions
            const planningLogic = alertRule.planning_logic || 'conservative';
            const goodDays: string[] = [];

            for (const day of allForecastData) {
              const waveStats = day.wave_stats || {};
              const windStats = day.wind_stats || {};
              
              const waveMin = alertRule.wave_min_m || 0;
              const waveMax = alertRule.wave_max_m || 100;
              const windMax = alertRule.wind_max_kmh || 100;
              
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
              
              const morningOk = day.morning_ok || false;
              const overallOk = waveOk && windOk && morningOk;
              
              if (overallOk) {
                goodDays.push(day.date);
              }
            }

            // Generate fresh affiliate links using unified date logic
            if (goodDays.length > 0) {
              const marker = process.env.NEXT_PUBLIC_AVIA_AFFILIATE_ID || process.env.AVIA_AFFILIATE_ID || '670448';
              const { flightUrl, hotelUrl } = generateAffiliateUrls(
                goodDays,
                alertRule.origin_iata,
                alertRule.dest_iata,
                marker,
                `alert_${ruleId}`
              );
              
              affiliateLink = flightUrl;
              hotelLink = hotelUrl;
              
              console.log('Quick Check: Generated fresh affiliate links:', {
                goodDays,
                affiliateLink,
                hotelLink
              });
            }
          }
        }
      } catch (error) {
        console.error('Quick Check: Error generating affiliate links:', error);
        // Fall back to cached links
      }
    }

    return {
      freshness,
      price: price.price_eur,
      affiliateLink,
      hotelLink,
      cachedAt: price.cached_at,
      warning
    };

  } catch (error) {
    console.error('Quick Check: Price data error:', error);
    return {
      freshness: 'none' as const,
      price: null,
      affiliateLink: null,
      hotelLink: null,
      cachedAt: null,
      warning: 'Error checking price data - worker will run soon'
    };
  }
}
