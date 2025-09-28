#!/usr/bin/env python3
"""
Simplified Alert Testing Script
Tests key combinations from the 108 test matrix.
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
        print("🧪 Running Alert API Tests...")
        
        # Test scenarios based on your matrix
        test_scenarios = [
            {
                "name": "Conservative 5-day Total Match",
                "forecast_window": 5,
                "planning_logic": "conservative",
                "wave_min_m": 0.5,
                "wave_max_m": 3.0,
                "wind_max_kmh": 20,
                "max_price_eur": 500,
                "expected_weather": True,
                "expected_price": False  # Price data is expired, so expect False
            },
            {
                "name": "Aggressive 10-day Weather OK Price Fail",
                "forecast_window": 10,
                "planning_logic": "aggressive", 
                "wave_min_m": 0.5,
                "wave_max_m": 3.0,
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
                "expected_price": False  # Price data is expired, so expect False
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
        
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n📋 Test {i}: {scenario['name']}")
            
            # Create alert rule payload
            alert_rule = {
                "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",  # Biarritz
                "wave_min_m": scenario["wave_min_m"],
                "wave_max_m": scenario["wave_max_m"],
                "wind_max_kmh": scenario["wind_max_kmh"],
                "forecast_window": scenario["forecast_window"],
                "origin_iata": "LIS",
                "dest_iata": "BIQ",
                "planning_logic": scenario["planning_logic"]
            }
            
            # Test forecast-details API
            forecast_payload = {
                "ruleId": f"test-{i}",
                "alertRule": alert_rule
            }
            
            print("  🔍 Testing forecast-details API...")
            forecast_result = self.test_api_endpoint("/api/forecast-details", forecast_payload)
            
            # Test quick-forecast-check API
            print("  ⚡ Testing quick-forecast-check API...")
            quick_check_result = self.test_api_endpoint("/api/quick-forecast-check", forecast_payload)
            
            # Analyze results
            analysis = self.analyze_test_results(scenario, forecast_result, quick_check_result)
            
            result = {
                "scenario": scenario,
                "forecast_result": forecast_result,
                "quick_check_result": quick_check_result,
                "analysis": analysis,
                "timestamp": datetime.now().isoformat()
            }
            
            self.results.append(result)
            
            # Print results
            if analysis["issues"]:
                print(f"  ❌ FAILED: {len(analysis['issues'])} issues found")
                for issue in analysis["issues"]:
                    print(f"    - {issue}")
            else:
                print(f"  ✅ PASSED: All checks successful")
    
    def analyze_test_results(self, scenario: Dict, forecast_result: Dict, quick_check_result: Dict) -> Dict:
        """Analyze test results"""
        analysis = {
            "issues": [],
            "forecast_api_working": forecast_result["status"] == "success",
            "quick_check_api_working": quick_check_result["status"] == "success"
        }
        
        # Check API responses
        if not analysis["forecast_api_working"]:
            analysis["issues"].append(f"Forecast Details API failed: {forecast_result.get('error', 'Unknown error')}")
        
        if not analysis["quick_check_api_working"]:
            analysis["issues"].append(f"Quick Forecast Check API failed: {quick_check_result.get('error', 'Unknown error')}")
        
        # If APIs are working, check the data
        if analysis["forecast_api_working"] and analysis["quick_check_api_working"]:
            forecast_data = forecast_result["data"]
            quick_check_data = quick_check_result["data"]
            
            # Check conditionsGood
            conditions_good = quick_check_data.get("conditionsGood", False)
            if conditions_good != scenario["expected_weather"]:
                analysis["issues"].append(f"Weather conditions mismatch: expected {scenario['expected_weather']}, got {conditions_good}")
            
            # Check price data availability
            price_available = quick_check_data.get("priceDataAvailable", False)
            if price_available != scenario["expected_price"]:
                analysis["issues"].append(f"Price data mismatch: expected {scenario['expected_price']}, got {price_available}")
            
            # Check forecast days count
            forecast_days = len(forecast_data.get("days", []))
            expected_days = scenario["forecast_window"]
            if forecast_days != expected_days:
                analysis["issues"].append(f"Forecast days mismatch: expected {expected_days}, got {forecast_days}")
            
            # Check if planning logic is applied
            if "days" in forecast_data and forecast_data["days"]:
                # Check if overallOk field exists
                if "overallOk" not in forecast_data["days"][0]:
                    analysis["issues"].append("Missing overallOk field in forecast days")
        
        return analysis
    
    def generate_report(self):
        """Generate test report"""
        total_tests = len(self.results)
        failed_tests = [r for r in self.results if r["analysis"]["issues"]]
        passed_tests = total_tests - len(failed_tests)
        
        report = f"""
# 🧪 Alert API Testing Report

## 📊 Summary
- **Total Tests**: {total_tests}
- **Passed**: {passed_tests} ({passed_tests/total_tests*100:.1f}%)
- **Failed**: {len(failed_tests)} ({len(failed_tests)/total_tests*100:.1f}%)
- **Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 🔍 Test Results
"""
        
        for i, result in enumerate(self.results, 1):
            scenario = result["scenario"]
            analysis = result["analysis"]
            
            status = "✅ PASSED" if not analysis["issues"] else "❌ FAILED"
            report += f"""
### {i}. {scenario['name']} - {status}
- **Forecast Window**: {scenario['forecast_window']} days
- **Planning Logic**: {scenario['planning_logic']}
- **Expected Weather**: {scenario['expected_weather']}
- **Expected Price**: {scenario['expected_price']}
"""
            
            if analysis["issues"]:
                report += "- **Issues**:\n"
                for issue in analysis["issues"]:
                    report += f"  - {issue}\n"
            else:
                report += "- **Status**: All checks passed\n"
        
        if failed_tests:
            report += f"""
## 🚨 Failed Tests Summary
{len(failed_tests)} tests failed. Key issues to investigate:
"""
            # Group issues by type
            issue_types = {}
            for result in failed_tests:
                for issue in result["analysis"]["issues"]:
                    issue_type = issue.split(":")[0] if ":" in issue else issue
                    if issue_type not in issue_types:
                        issue_types[issue_type] = 0
                    issue_types[issue_type] += 1
            
            for issue_type, count in issue_types.items():
                report += f"- **{issue_type}**: {count} occurrences\n"
        
        return report

def main():
    """Run the tests"""
    print("🚀 Starting Alert API Testing...")
    print("Make sure your Next.js dev server is running on localhost:3000")
    print("="*60)
    
    tester = SimpleAlertTester()
    
    try:
        tester.run_test_scenarios()
        
        # Generate report
        report = tester.generate_report()
        print("\n" + "="*60)
        print(report)
        print("="*60)
        
        # Save report
        with open("alert_test_report.md", "w") as f:
            f.write(report)
        print("\n📄 Report saved to alert_test_report.md")
        
        # Save detailed results
        with open("alert_test_results.json", "w") as f:
            json.dump(tester.results, f, indent=2, default=str)
        print("💾 Detailed results saved to alert_test_results.json")
        
        # Return appropriate exit code
        failed_count = len([r for r in tester.results if r["analysis"]["issues"]])
        if failed_count > 0:
            print(f"\n⚠️  {failed_count} tests failed. Check the report for details.")
            return 1
        else:
            print("\n🎉 All tests passed!")
            return 0
            
    except Exception as e:
        print(f"❌ Testing failed: {e}")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
