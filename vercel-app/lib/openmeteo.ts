/**
 * Open-Meteo API integration for fetching forecast data
 * Based on the worker's fetch_wave_wind_stats function
 */

export interface SpotInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface ForecastDay {
  date: string;
  wave_stats: {
    min: number;
    max: number;
    avg: number;
  };
  wind_stats: {
    min: number;
    max: number;
    avg: number;
  };
  morning_ok: boolean;
}

export interface OpenMeteoResponse {
  hourly: {
    time: string[];
    wave_height?: number[];
    wind_speed_10m?: number[];
  };
}

/**
 * Fetch wave and wind forecast data from Open-Meteo APIs
 * Returns aggregated daily stats for the specified forecast window
 */
export async function fetchWaveWindStats(
  spot: SpotInfo,
  forecastDays: number = 5
): Promise<ForecastDay[]> {
  const hours = [6, 7, 8, 9, 10, 11, 12]; // Morning hours for surf conditions
  // Open-Meteo forecast_days parameter: request exactly the number of days we need
  // The API returns forecast_days starting from today
  const forecastDaysLimited = Math.min(forecastDays, 16); // Open-Meteo supports up to 16 days

  console.log(`[openmeteo] Fetching forecast for ${spot.name} (${forecastDaysLimited} days)`);

  try {
    // Fetch both marine and weather data in parallel
    const [marineData, weatherData] = await Promise.all([
      fetchMarineData(spot, forecastDaysLimited),
      fetchWeatherData(spot, forecastDaysLimited)
    ]);

    if (!marineData || !weatherData) {
      console.error('[openmeteo] Failed to fetch marine or weather data');
      return [];
    }

    // Merge the hourly data by timestamp
    const mergedData = mergeHourlyData(marineData, weatherData);
    console.log(`[openmeteo] Merged ${Object.keys(mergedData).length} hourly data points`);

    // Aggregate by day and filter for morning hours
    const dailyStats = aggregateDailyStats(mergedData, hours);
    console.log(`[openmeteo] Generated ${dailyStats.length} daily forecasts`);

    return dailyStats;

  } catch (error) {
    console.error('[openmeteo] Error fetching forecast data:', error);
    return [];
  }
}

/**
 * Fetch marine forecast data (wave heights) from Open-Meteo Marine API
 */
async function fetchMarineData(spot: SpotInfo, forecastDays: number): Promise<OpenMeteoResponse | null> {
  const url = 'https://marine-api.open-meteo.com/v1/marine';
  const params = new URLSearchParams({
    latitude: spot.latitude.toString(),
    longitude: spot.longitude.toString(),
    hourly: 'wave_height',
    forecast_days: forecastDays.toString(),
    past_days: '0',
    timezone: spot.timezone,
  });

  try {
    const start = Date.now();
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Marine API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const elapsed = Date.now() - start;
    console.log(`[openmeteo] Marine API: ${data.hourly?.time?.length || 0} hours in ${elapsed}ms`);
    
    return data;
  } catch (error) {
    console.error('[openmeteo] Marine API error:', error);
    return null;
  }
}

/**
 * Fetch weather forecast data (wind speeds) from Open-Meteo Weather API
 */
async function fetchWeatherData(spot: SpotInfo, forecastDays: number): Promise<OpenMeteoResponse | null> {
  const url = 'https://api.open-meteo.com/v1/forecast';
  const params = new URLSearchParams({
    latitude: spot.latitude.toString(),
    longitude: spot.longitude.toString(),
    hourly: 'wind_speed_10m',
    wind_speed_unit: 'kmh',
    forecast_days: forecastDays.toString(),
    past_days: '0',
    timezone: spot.timezone,
  });

  try {
    const start = Date.now();
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const elapsed = Date.now() - start;
    console.log(`[openmeteo] Weather API: ${data.hourly?.time?.length || 0} hours in ${elapsed}ms`);
    
    return data;
  } catch (error) {
    console.error('[openmeteo] Weather API error:', error);
    return null;
  }
}

/**
 * Merge marine and weather hourly data by timestamp
 */
function mergeHourlyData(marineData: OpenMeteoResponse, weatherData: OpenMeteoResponse): Record<string, { wave: number | null; wind: number | null }> {
  const marine = marineData.hourly;
  const weather = weatherData.hourly;
  
  const merged: Record<string, { wave: number | null; wind: number | null }> = {};
  
  // Add marine data
  if (marine.time && marine.wave_height) {
    marine.time.forEach((time, index) => {
      merged[time] = {
        wave: marine.wave_height?.[index] ?? null,
        wind: null
      };
    });
  }
  
  // Add weather data
  if (weather.time && weather.wind_speed_10m) {
    weather.time.forEach((time, index) => {
      if (merged[time]) {
        merged[time].wind = weather.wind_speed_10m?.[index] ?? null;
      } else {
        merged[time] = {
          wave: null,
          wind: weather.wind_speed_10m?.[index] ?? null
        };
      }
    });
  }
  
  return merged;
}

/**
 * Aggregate hourly data into daily statistics for morning hours
 */
function aggregateDailyStats(
  hourlyData: Record<string, { wave: number | null; wind: number | null }>,
  morningHours: number[]
): ForecastDay[] {
  const dailyGroups: Record<string, { wave: number[]; wind: number[] }> = {};
  
  // Group by date and filter for morning hours
  Object.entries(hourlyData).forEach(([timestamp, data]) => {
    const date = new Date(timestamp);
    const hour = date.getHours();
    
    // Only include morning hours
    if (!morningHours.includes(hour)) {
      return;
    }
    
    const dateKey = date.toISOString().split('T')[0];
    
    if (!dailyGroups[dateKey]) {
      dailyGroups[dateKey] = { wave: [], wind: [] };
    }
    
    if (data.wave !== null) {
      dailyGroups[dateKey].wave.push(data.wave);
    }
    if (data.wind !== null) {
      dailyGroups[dateKey].wind.push(data.wind);
    }
  });
  
  // Calculate daily statistics
  const dailyStats: ForecastDay[] = Object.entries(dailyGroups)
    .map(([date, data]) => {
      const waveStats = calculateStats(data.wave);
      const windStats = calculateStats(data.wind);
      
      // Determine if morning conditions are good (simplified logic)
      // This matches the worker's morning_ok logic
      const morningOk = waveStats.avg > 0 && windStats.max < 50; // Basic surf conditions
      
      return {
        date,
        wave_stats: waveStats,
        wind_stats: windStats,
        morning_ok: morningOk
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return dailyStats;
}

/**
 * Calculate min, max, and average statistics for an array of numbers
 */
function calculateStats(values: number[]): { min: number; max: number; avg: number } {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0 };
  }
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  return { min, max, avg };
}
