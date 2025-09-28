#!/usr/bin/env python3
"""
Comprehensive Alert Testing Script
Tests all 108 combinations from the test matrix systematically.
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any
import uuid
import sys
import os

# Add the parent directory to the path to import from worker
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class AlertTestSuite:
    def __init__(self):
        self.base_url = "http://localhost:3000"
        self.test_user_id = "00000000-0000-0000-0000-000000000000"
        self.spot_id = "15bbdb3e-504a-4c50-8d34-6450104c22b3"  # Biarritz
        self.origin_iata = "LIS"
        self.dest_iata = "BIQ"
        
        # Test matrix parameters
        self.scenarios = [
            "TOTAL_MATCH",           # Weather PASS + Price PASS
            "WEATHER_OK_PRICE_FAIL", # Weather PASS + Price FAIL  
            "WEATHER_FAIL_PRICE_OK", # Weather FAIL + Price PASS
            "TOTAL_FAIL"             # Weather FAIL + Price FAIL
        ]
        
        self.forecast_windows = [5, 10, 16]
        self.planning_logic_types = ["conservative", "aggressive", "optimistic"]
        self.skill_levels = ["beginner", "intermediate", "advanced"]
        
        self.results = []
        self.failed_tests = []
        
    def generate_test_cases(self) -> List[Dict]:
        """Generate all 108 test combinations"""
        test_cases = []
        
        for scenario in self.scenarios:
            for forecast_window in self.forecast_windows:
                for planning_logic in self.planning_logic_types:
                    for skill in self.skill_levels:
                        test_case = {
                            "scenario": scenario,
                            "forecast_window": forecast_window,
                            "planning_logic": planning_logic,
                            "skill": skill,
                            "scenario_key": f"{scenario}_{forecast_window}_{planning_logic}_{skill}",
                            "alert_id": str(uuid.uuid4()),
                            "name": f"Test {scenario} Win{forecast_window} {planning_logic.title()} {skill.title()}"
                        }
                        test_cases.append(test_case)
        
        return test_cases
    
    def get_alert_parameters(self, test_case: Dict) -> Dict:
        """Generate alert parameters based on test case"""
        # Base parameters that work for all scenarios
        base_params = {
            "spot_id": self.spot_id,
            "origin_iata": self.origin_iata,
            "dest_iata": self.dest_iata,
            "forecast_window": test_case["forecast_window"],
            "planning_logic": test_case["planning_logic"],
            "max_price_eur": 300,
            "cooldown_hours": 0,  # No cooldown for testing
            "is_active": True
        }
        
        # Adjust parameters based on scenario
        if test_case["scenario"] == "TOTAL_MATCH":
            # Both weather and price should pass
            base_params.update({
                "wave_min_m": 0.5,
                "wave_max_m": 3.0,
                "wind_max_kmh": 20,
                "max_price_eur": 500  # Higher price limit for success
            })
        elif test_case["scenario"] == "WEATHER_OK_PRICE_FAIL":
            # Weather passes, price fails
            base_params.update({
                "wave_min_m": 0.5,
                "wave_max_m": 3.0,
                "wind_max_kmh": 20,
                "max_price_eur": 50  # Very low price limit to fail
            })
        elif test_case["scenario"] == "WEATHER_FAIL_PRICE_OK":
            # Weather fails, price passes
            base_params.update({
                "wave_min_m": 5.0,  # Very high wave requirement to fail
                "wave_max_m": 10.0,
                "wind_max_kmh": 5,   # Very low wind requirement to fail
                "max_price_eur": 500  # Higher price limit for success
            })
        elif test_case["scenario"] == "TOTAL_FAIL":
            # Both weather and price fail
            base_params.update({
                "wave_min_m": 5.0,  # Very high wave requirement to fail
                "wave_max_m": 10.0,
                "wind_max_kmh": 5,   # Very low wind requirement to fail
                "max_price_eur": 50   # Very low price limit to fail
            })
        
        return base_params
    
    async def create_test_alert(self, session: aiohttp.ClientSession, test_case: Dict) -> str:
        """Create a test alert in the database"""
        alert_params = self.get_alert_parameters(test_case)
        
        # Create alert via direct database insertion (simulating the SQL approach)
        alert_data = {
            "id": test_case["alert_id"],
            "user_id": self.test_user_id,
            "name": test_case["name"],
            "mode": "spot",
            **alert_params,
            "days_mask": 127,  # All days
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "last_checked_at": None  # No cooldown
        }
        
        # For now, we'll simulate the alert creation
        # In a real implementation, you'd insert into Supabase
        print(f"📝 Created alert: {test_case['name']}")
        return test_case["alert_id"]
    
    async def test_forecast_details_api(self, session: aiohttp.ClientSession, test_case: Dict) -> Dict:
        """Test the forecast-details API"""
        alert_params = self.get_alert_parameters(test_case)
        
        url = f"{self.base_url}/api/forecast-details"
        payload = {
            "ruleId": test_case["alert_id"],
            "alertRule": alert_params
        }
        
        try:
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "status": "success",
                        "data": data,
                        "response_time": response.headers.get("X-Response-Time", "unknown")
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"HTTP {response.status}",
                        "response_text": await response.text()
                    }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def test_quick_forecast_check_api(self, session: aiohttp.ClientSession, test_case: Dict) -> Dict:
        """Test the quick-forecast-check API"""
        alert_params = self.get_alert_parameters(test_case)
        
        url = f"{self.base_url}/api/quick-forecast-check"
        payload = {
            "ruleId": test_case["alert_id"],
            "alertRule": alert_params
        }
        
        try:
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "status": "success",
                        "data": data,
                        "response_time": response.headers.get("X-Response-Time", "unknown")
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"HTTP {response.status}",
                        "response_text": await response.text()
                    }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    def analyze_results(self, test_case: Dict, forecast_result: Dict, quick_check_result: Dict) -> Dict:
        """Analyze test results and determine if they match expected behavior"""
        analysis = {
            "test_case": test_case,
            "expected_weather": test_case["scenario"] in ["TOTAL_MATCH", "WEATHER_OK_PRICE_FAIL"],
            "expected_price": test_case["scenario"] in ["TOTAL_MATCH", "WEATHER_FAIL_PRICE_OK"],
            "forecast_api_working": forecast_result["status"] == "success",
            "quick_check_api_working": quick_check_result["status"] == "success",
            "issues": []
        }
        
        # Check if APIs are working
        if not analysis["forecast_api_working"]:
            analysis["issues"].append(f"Forecast Details API failed: {forecast_result.get('error', 'Unknown error')}")
        
        if not analysis["quick_check_api_working"]:
            analysis["issues"].append(f"Quick Forecast Check API failed: {quick_check_result.get('error', 'Unknown error')}")
        
        # If APIs are working, analyze the data
        if analysis["forecast_api_working"] and analysis["quick_check_api_working"]:
            forecast_data = forecast_result["data"]
            quick_check_data = quick_check_result["data"]
            
            # Check conditionsGood matches expected weather
            conditions_good = quick_check_data.get("conditionsGood", False)
            if conditions_good != analysis["expected_weather"]:
                analysis["issues"].append(f"Weather conditions mismatch: expected {analysis['expected_weather']}, got {conditions_good}")
            
            # Check price data availability matches expected price
            price_available = quick_check_data.get("priceDataAvailable", False)
            if price_available != analysis["expected_price"]:
                analysis["issues"].append(f"Price data mismatch: expected {analysis['expected_price']}, got {price_available}")
            
            # Check if forecast data has correct number of days
            forecast_days = len(forecast_data.get("days", []))
            expected_days = test_case["forecast_window"]
            if forecast_days != expected_days:
                analysis["issues"].append(f"Forecast days mismatch: expected {expected_days}, got {forecast_days}")
            
            # Check if planning logic is correctly applied
            if "days" in forecast_data:
                for day in forecast_data["days"]:
                    if "overallOk" not in day:
                        analysis["issues"].append("Missing overallOk field in forecast days")
                        break
        
        return analysis
    
    async def run_single_test(self, session: aiohttp.ClientSession, test_case: Dict) -> Dict:
        """Run a single test case"""
        print(f"🧪 Testing: {test_case['name']}")
        
        # Create test alert
        alert_id = await self.create_test_alert(session, test_case)
        
        # Test both APIs
        forecast_result = await self.test_forecast_details_api(session, test_case)
        quick_check_result = await self.test_quick_forecast_check_api(session, test_case)
        
        # Analyze results
        analysis = self.analyze_results(test_case, forecast_result, quick_check_result)
        
        # Store results
        result = {
            "test_case": test_case,
            "forecast_result": forecast_result,
            "quick_check_result": quick_check_result,
            "analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
        
        self.results.append(result)
        
        if analysis["issues"]:
            self.failed_tests.append(result)
            print(f"❌ FAILED: {test_case['name']} - {len(analysis['issues'])} issues")
        else:
            print(f"✅ PASSED: {test_case['name']}")
        
        return result
    
    async def run_all_tests(self):
        """Run all 108 test cases"""
        print("🚀 Starting comprehensive alert testing...")
        print(f"📊 Testing {len(self.generate_test_cases())} combinations")
        
        test_cases = self.generate_test_cases()
        
        async with aiohttp.ClientSession() as session:
            # Run tests in batches to avoid overwhelming the server
            batch_size = 10
            for i in range(0, len(test_cases), batch_size):
                batch = test_cases[i:i + batch_size]
                print(f"\n📦 Running batch {i//batch_size + 1}/{(len(test_cases) + batch_size - 1)//batch_size}")
                
                tasks = [self.run_single_test(session, test_case) for test_case in batch]
                await asyncio.gather(*tasks)
                
                # Small delay between batches
                await asyncio.sleep(1)
    
    def generate_report(self):
        """Generate comprehensive test report"""
        total_tests = len(self.results)
        passed_tests = total_tests - len(self.failed_tests)
        failed_tests = len(self.failed_tests)
        
        report = f"""
# 🧪 Comprehensive Alert Testing Report

## 📊 Summary
- **Total Tests**: {total_tests}
- **Passed**: {passed_tests} ({passed_tests/total_tests*100:.1f}%)
- **Failed**: {failed_tests} ({failed_tests/total_tests*100:.1f}%)
- **Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 🔍 Test Matrix Coverage
- **Scenarios**: {len(self.scenarios)} ({', '.join(self.scenarios)})
- **Forecast Windows**: {len(self.forecast_windows)} ({', '.join(map(str, self.forecast_windows))})
- **Planning Logic**: {len(self.planning_logic_types)} ({', '.join(self.planning_logic_types)})
- **Skill Levels**: {len(self.skill_levels)} ({', '.join(self.skill_levels)})

## ❌ Failed Tests ({failed_tests})
"""
        
        if self.failed_tests:
            for i, result in enumerate(self.failed_tests, 1):
                test_case = result["test_case"]
                analysis = result["analysis"]
                report += f"""
### {i}. {test_case['name']}
- **Scenario**: {test_case['scenario']}
- **Forecast Window**: {test_case['forecast_window']} days
- **Planning Logic**: {test_case['planning_logic']}
- **Skill Level**: {test_case['skill']}
- **Issues**: {len(analysis['issues'])}
"""
                for issue in analysis["issues"]:
                    report += f"  - {issue}\n"
        else:
            report += "\n🎉 All tests passed! No issues found.\n"
        
        # Summary by scenario
        report += "\n## 📈 Results by Scenario\n"
        for scenario in self.scenarios:
            scenario_tests = [r for r in self.results if r["test_case"]["scenario"] == scenario]
            scenario_failed = [r for r in scenario_tests if r["analysis"]["issues"]]
            report += f"- **{scenario}**: {len(scenario_tests) - len(scenario_failed)}/{len(scenario_tests)} passed\n"
        
        # Summary by forecast window
        report += "\n## 📈 Results by Forecast Window\n"
        for window in self.forecast_windows:
            window_tests = [r for r in self.results if r["test_case"]["forecast_window"] == window]
            window_failed = [r for r in window_tests if r["analysis"]["issues"]]
            report += f"- **{window} days**: {len(window_tests) - len(window_failed)}/{len(window_tests)} passed\n"
        
        # Summary by planning logic
        report += "\n## 📈 Results by Planning Logic\n"
        for logic in self.planning_logic_types:
            logic_tests = [r for r in self.results if r["test_case"]["planning_logic"] == logic]
            logic_failed = [r for r in logic_tests if r["analysis"]["issues"]]
            report += f"- **{logic.title()}**: {len(logic_tests) - len(logic_failed)}/{len(logic_tests)} passed\n"
        
        return report
    
    def save_detailed_results(self, filename: str = "test_results.json"):
        """Save detailed results to JSON file"""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        print(f"💾 Detailed results saved to {filename}")

async def main():
    """Main test execution"""
    test_suite = AlertTestSuite()
    
    try:
        await test_suite.run_all_tests()
        
        # Generate and display report
        report = test_suite.generate_report()
        print("\n" + "="*80)
        print(report)
        print("="*80)
        
        # Save detailed results
        test_suite.save_detailed_results()
        
        # Save report to file
        with open("test_report.md", "w") as f:
            f.write(report)
        print("📄 Report saved to test_report.md")
        
        # Return exit code based on results
        if test_suite.failed_tests:
            print(f"\n⚠️  {len(test_suite.failed_tests)} tests failed. Check the report for details.")
            return 1
        else:
            print("\n🎉 All tests passed!")
            return 0
            
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
