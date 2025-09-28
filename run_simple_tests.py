#!/usr/bin/env python3
"""
Simple Alert Testing Script - No emojis to avoid encoding issues
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List

class SimpleAlertTester:
    def __init__(self):
        self.base_url = "http://localhost:3000"
        self.results = []
        
    def test_api_endpoint(self, endpoint: str, payload: Dict) -> Dict:
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            start_time = time.time()
            response = requests.post(url, json=payload, timeout=30)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                return {
                    "status": "success",
                    "data": response.json(),
                    "response_time": f"{response_time:.3f}s"
                }
            else:
                return {
                    "status": "error",
                    "error": f"HTTP {response.status_code}",
                    "response_text": response.text
                }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    def run_test_scenarios(self):
        """Run key test scenarios"""
        print("Running Alert API Tests...")
        
        # Test scenarios based on your matrix
        test_scenarios = [
            {
                "name": "Conservative 5-day Total Match",
                "forecast_window": 5,
                "planning_logic": "conservative",
                "wave_min_m": 0.5,
                "wave_max_m": 2.5,
                "wind_max_kmh": 20,
                "max_price_eur": 500,
                "expected_weather": True,
                "expected_price": False  # Price data is expired/stale
            },
            {
                "name": "Aggressive 10-day Weather OK Price Fail",
                "forecast_window": 10,
                "planning_logic": "aggressive", 
                "wave_min_m": 0.5,
                "wave_max_m": 2.5,
                "wind_max_kmh": 20,
                "max_price_eur": 50,  # Low price to fail
                "expected_weather": True,
                "expected_price": False
            },
            {
                "name": "Optimistic 16-day Weather Fail Price OK",
                "forecast_window": 16,
                "planning_logic": "optimistic",
                "wave_min_m": 5.0,  # High wave to fail
                "wave_max_m": 10.0,
                "wind_max_kmh": 5,   # Low wind to fail
                "max_price_eur": 500,
                "expected_weather": False,
                "expected_price": False  # Price data is expired/stale
            },
            {
                "name": "Conservative 5-day Total Fail",
                "forecast_window": 5,
                "planning_logic": "conservative",
                "wave_min_m": 5.0,  # High wave to fail
                "wave_max_m": 10.0,
                "wind_max_kmh": 5,   # Low wind to fail
                "max_price_eur": 50,  # Low price to fail
                "expected_weather": False,
                "expected_price": False
            }
        ]
        
        for i, test in enumerate(test_scenarios, 1):
            print(f"\nTest {i}: {test['name']}")
            
            # Test forecast-details API
            print("  Testing forecast-details API...")
            forecast_payload = {
                "ruleId": "test-rule-id",
                "alertRule": {
                    "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
                    "wave_min_m": test["wave_min_m"],
                    "wave_max_m": test["wave_max_m"],
                    "wind_max_kmh": test["wind_max_kmh"],
                    "forecast_window": test["forecast_window"],
                    "origin_iata": "LIS",
                    "dest_iata": "BIQ",
                    "planning_logic": test["planning_logic"]
                }
            }
            
            forecast_result = self.test_api_endpoint("/api/forecast-details", forecast_payload)
            
            # Test quick-forecast-check API
            print("  Testing quick-forecast-check API...")
            quick_payload = {
                "ruleId": "test-rule-id",
                "alertRule": {
                    "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
                    "wave_min_m": test["wave_min_m"],
                    "wave_max_m": test["wave_max_m"],
                    "wind_max_kmh": test["wind_max_kmh"],
                    "forecast_window": test["forecast_window"],
                    "origin_iata": "LIS",
                    "dest_iata": "BIQ",
                    "max_price_eur": test["max_price_eur"],
                    "planning_logic": test["planning_logic"]
                }
            }
            
            quick_result = self.test_api_endpoint("/api/quick-forecast-check", quick_payload)
            
            # Analyze results
            test_passed = True
            
            if forecast_result["status"] == "success":
                forecast_data = forecast_result["data"]
                good_days = len([day for day in forecast_data.get("days", []) if day.get("overallOk", False)])
                weather_ok = good_days > 0
                
                if weather_ok != test["expected_weather"]:
                    print(f"  WARNING: Weather expectation mismatch. Expected {test['expected_weather']}, got {weather_ok}")
                    test_passed = False
            else:
                print(f"  ERROR: Forecast API failed: {forecast_result.get('error', 'Unknown error')}")
                test_passed = False
            
            if quick_result["status"] == "success":
                quick_data = quick_result["data"]
                conditions_good = quick_data.get("conditionsGood", False)
                price_available = quick_data.get("priceDataAvailable", False)
                
                if conditions_good != test["expected_weather"]:
                    print(f"  WARNING: Quick check weather mismatch. Expected {test['expected_weather']}, got {conditions_good}")
                    test_passed = False
                    
                if price_available != test["expected_price"]:
                    print(f"  WARNING: Price expectation mismatch. Expected {test['expected_price']}, got {price_available}")
                    test_passed = False
            else:
                print(f"  ERROR: Quick check API failed: {quick_result.get('error', 'Unknown error')}")
                test_passed = False
            
            # Store result
            self.results.append({
                "test_name": test["name"],
                "passed": test_passed,
                "forecast_result": forecast_result,
                "quick_result": quick_result,
                "expected_weather": test["expected_weather"],
                "expected_price": test["expected_price"]
            })
            
            if test_passed:
                print("  PASSED: All checks successful")
            else:
                print("  FAILED: Some checks failed")
    
    def generate_report(self):
        """Generate a comprehensive test report"""
        print("\n" + "="*60)
        print("\n# Alert API Testing Report")
        print("\n## Summary")
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["passed"])
        failed_tests = total_tests - passed_tests
        
        print(f"- **Total Tests**: {total_tests}")
        print(f"- **Passed**: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
        print(f"- **Failed**: {failed_tests} ({failed_tests/total_tests*100:.1f}%)")
        print(f"- **Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        print("\n## Test Results")
        
        for i, result in enumerate(self.results, 1):
            status = "PASSED" if result["passed"] else "FAILED"
            print(f"\n### {i}. {result['test_name']} - {status}")
            print(f"- **Expected Weather**: {result['expected_weather']}")
            print(f"- **Expected Price**: {result['expected_price']}")
            print(f"- **Status**: {status}")
        
        print("\n" + "="*60)

def main():
    print("Starting Alert API Testing...")
    print("Make sure your Next.js dev server is running on localhost:3000")
    print("="*60)
    
    tester = SimpleAlertTester()
    tester.run_test_scenarios()
    tester.generate_report()

if __name__ == "__main__":
    main()
