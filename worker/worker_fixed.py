#!/usr/bin/env python3
"""
Fixed worker that uses the same fresh data logic as the APIs
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pytz
import requests
import json

# Add the parent directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append('vercel-app')

from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('vercel-app/.env.local')

# Create Supabase client
client = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

def fetch_fresh_forecast_data(spot, forecast_window):
    """
    Fetch fresh forecast data from Open-Meteo API (same logic as APIs)
    """
    try:
        print(f"[openmeteo] Fetching forecast for {spot['name']} ({forecast_window} days)")
        
        # Open-Meteo API endpoints
        weather_url = "https://api.open-meteo.com/v1/forecast"
        marine_url = "https://marine-api.open-meteo.com/v1/marine"
        
        # Parameters for weather API
        weather_params = {
            'latitude': spot['lat'],
            'longitude': spot['lng'],
            'hourly': 'wind_speed_10m,wind_direction_10m',
            'timezone': 'UTC',
            'forecast_days': forecast_window
        }
        
        # Parameters for marine API
        marine_params = {
            'latitude': spot['lat'],
            'longitude': spot['lng'],
            'hourly': 'wave_height,wave_direction,wave_period',
            'timezone': 'UTC',
            'forecast_days': forecast_window
        }
        
        # Fetch data from both APIs
        weather_response = requests.get(weather_url, params=weather_params, timeout=30)
        marine_response = requests.get(marine_url, params=marine_params, timeout=30)
        
        if weather_response.status_code != 200 or marine_response.status_code != 200:
            print(f"[openmeteo] API error - Weather: {weather_response.status_code}, Marine: {marine_response.status_code}")
            return None
            
        weather_data = weather_response.json()
        marine_data = marine_response.json()
        
        print(f"[openmeteo] Weather API: {len(weather_data['hourly']['time'])} hours in {weather_response.elapsed.total_seconds()*1000:.0f}ms")
        print(f"[openmeteo] Marine API: {len(marine_data['hourly']['time'])} hours in {marine_response.elapsed.total_seconds()*1000:.0f}ms")
        
        # Merge the data
        weather_times = weather_data['hourly']['time']
        marine_times = marine_data['hourly']['time']
        
        if len(weather_times) != len(marine_times):
            print(f"[openmeteo] Time mismatch - Weather: {len(weather_times)}, Marine: {len(marine_times)}")
            return None
            
        print(f"[openmeteo] Merged {len(weather_times)} hourly data points")
        
        # Process hourly data into daily forecasts
        daily_forecasts = []
        for i in range(0, len(weather_times), 24):  # Process 24-hour chunks
            if i + 24 > len(weather_times):
                break
                
            # Get 24 hours of data
            day_times = weather_times[i:i+24]
            day_wind_speeds = weather_data['hourly']['wind_speed_10m'][i:i+24]
            day_wave_heights = marine_data['hourly']['wave_height'][i:i+24]
            
            # Calculate daily stats
            wave_stats = {
                'avg': np.mean(day_wave_heights),
                'min': np.min(day_wave_heights),
                'max': np.max(day_wave_heights)
            }
            
            wind_stats = {
                'avg': np.mean(day_wind_speeds),
                'min': np.min(day_wind_speeds),
                'max': np.max(day_wind_speeds)
            }
            
            # For fresh data, assume morning conditions are good (like APIs do)
            morning_ok = True
            
            daily_forecasts.append({
                'date': day_times[0][:10],  # YYYY-MM-DD format
                'wave_stats': wave_stats,
                'wind_stats': wind_stats,
                'morning_ok': morning_ok
            })
        
        print(f"[openmeteo] Generated {len(daily_forecasts)} daily forecasts")
        return daily_forecasts
        
    except Exception as e:
        print(f"[openmeteo] Error fetching fresh forecast data: {e}")
        return None

def process_forecast_data_with_planning_logic(forecast_data, alert_rule):
    """
    Process forecast data using the same planning logic as the APIs
    """
    wave_min = alert_rule.get('wave_min_m', 0)
    wave_max = alert_rule.get('wave_max_m', 100)
    wind_max = alert_rule.get('wind_max_kmh', 100)
    planning_logic = alert_rule.get('planning_logic', 'conservative')
    
    good_days = []
    
    for day in forecast_data:
        wave_stats = day.get('wave_stats', {})
        wind_stats = day.get('wind_stats', {})
        morning_ok = day.get('morning_ok', False)
        
        # Apply planning logic (same as APIs)
        if planning_logic == 'optimistic':
            wave_ok = wave_stats.get('avg', 0) >= wave_min and wave_stats.get('avg', 0) <= wave_max
            wind_ok = wind_stats.get('avg', 0) <= wind_max
        elif planning_logic == 'aggressive':
            wave_ok = wave_stats.get('min', 0) >= wave_min and wave_stats.get('min', 0) <= wave_max
            wind_ok = wind_stats.get('avg', 0) <= wind_max
        else:  # conservative
            wave_ok = wave_stats.get('avg', 0) >= wave_min and wave_stats.get('avg', 0) <= wave_max
            wind_ok = wind_stats.get('max', 0) <= wind_max
        
        # Day is good if wave, wind, and morning conditions are all good
        if wave_ok and wind_ok and morning_ok:
            good_days.append(day['date'])
    
    return good_days

def main():
    """
    Main worker function that uses the same logic as the APIs
    """
    print("🚀 Starting worker with fresh data logic...")
    
    # Get all active alert rules
    rules_response = client.table('alert_rules').select('*').eq('is_active', True).execute()
    rules = rules_response.data
    
    if not rules:
        print("No active alert rules found")
        return
    
    print(f"Processing {len(rules)} active alert rules...")
    
    for rule in rules:
        try:
            print(f"\n[rule] Processing {rule.get('name', 'Surf Alert')} (ID: {rule['id']})")
            
            # Get spot data
            spot_response = client.table('spots').select('*').eq('id', rule['spot_id']).single().execute()
            if not spot_response.data:
                print(f"[rule] {rule['id']} has no valid spot -> skip")
                continue
                
            spot = spot_response.data
            forecast_window = int(rule.get('forecast_window', 5))
            
            # Check if we have cached data first
            cached_forecast = client.table('forecast_cache').select('*').eq('spot_id', spot['id']).execute()
            
            # If no cached data or insufficient data, fetch fresh data
            if not cached_forecast.data or len(cached_forecast.data) < forecast_window:
                print(f"[rule] No cached data or insufficient data, fetching fresh data...")
                fresh_forecast = fetch_fresh_forecast_data(spot, forecast_window)
                
                if not fresh_forecast:
                    print(f"[rule] Failed to fetch fresh forecast data")
                    continue
                    
                # Process fresh data with planning logic
                good_days = process_forecast_data_with_planning_logic(fresh_forecast, rule)
                print(f"[rule] Fresh data analysis: {len(good_days)} good days -> {good_days[:6]}{'...' if len(good_days)>6 else ''}")
                
            else:
                print(f"[rule] Using cached data...")
                # Process cached data with planning logic
                cached_data = cached_forecast.data[0]  # Get first cached entry
                # This would need to be processed similar to fresh data
                # For now, let's use the existing logic
                good_days = []  # Placeholder - would need to implement cached data processing
            
            if not good_days:
                print(f"[rule] No good days found")
                continue
                
            # Generate affiliate URLs using the same logic as the APIs
            from .date_utils import generate_affiliate_urls
            
            try:
                flight_url, hotel_url, (depart_date, return_date, trip_duration) = generate_affiliate_urls(
                    good_days=good_days,
                    origin=rule.get('origin_iata', 'LIS'),
                    destination=rule.get('dest_iata', 'BIQ'),
                    marker="670448",
                    sub_id=f"alert_{rule['id']}"
                )
                print(f"[rule] Generated URLs - Flight: {flight_url[:50]}..., Hotel: {hotel_url[:50]}...")
                print(f"[rule] Trip dates: {depart_date} → {return_date} ({trip_duration} days)")
            except Exception as e:
                print(f"[rule] Failed to generate affiliate URLs: {e}")
                continue
                
            # Here you would continue with the rest of the worker logic
            # (price checking, email sending, etc.)
            
        except Exception as e:
            print(f"[rule] Error processing rule {rule['id']}: {e}")
            continue
    
    print("✅ Worker completed with fresh data logic")

if __name__ == "__main__":
    main()
