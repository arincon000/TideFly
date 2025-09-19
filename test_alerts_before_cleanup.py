import requests
import json

# Test the existing alerts before cleanup
print('=== TESTING EXISTING ALERTS BEFORE CLEANUP ===')
response = requests.get('http://localhost:3000/api/alerts')
if response.status_code == 200:
    alerts = response.json()
    print(f'Found {len(alerts)} existing alerts:')
    for alert in alerts:
        print(f'- {alert.get("name", "Unnamed")} (ID: {alert.get("id", "Unknown")[:8]}...)')
        print(f'  Status: {alert.get("status", "Unknown")}')
        print(f'  Conditions: Wave {alert.get("wave_min_m", 0)}-{alert.get("wave_max_m", "∞")}m, Wind <{alert.get("wind_max_kmh", 0)}km/h')
        print()
else:
    print(f'Error fetching alerts: {response.status_code}')
