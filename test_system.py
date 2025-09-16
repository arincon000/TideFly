#!/usr/bin/env python3
"""
Comprehensive Test Suite for Smart Revenue-Optimized Alert System
Tests all components: APIs, database, worker, and UI integration
"""

import os
import sys
import json
import time
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List

# Add worker directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'worker'))

class SystemTester:
    def __init__(self):
        self.base_url = "http://localhost:3000"
        self.test_results = []
        self.passed = 0
        self.failed = 0
        
    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def test_server_availability(self):
        """Test if Next.js server is running"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            if response.status_code == 200:
                self.log_test("Server Availability", True, f"Server responding on {self.base_url}")
                return True
            else:
                self.log_test("Server Availability", False, f"Server returned status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_test("Server Availability", False, f"Server not accessible: {e}")
            return False
    
    def test_quick_forecast_check_api(self):
        """Test Quick Forecast Check API"""
        test_data = {
            "ruleId": "test-rule-123",
            "alertRule": {
                "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
                "wave_min_m": 1.2,
                "wave_max_m": 2.5,
                "wind_max_kmh": 25,
                "forecast_window": 5,
                "planning_logic": "conservative"
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/quick-forecast-check",
                json=test_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["conditionsGood", "priceDataAvailable", "priceFreshness", "shouldTriggerWorker", "forecastSummary"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Quick Forecast Check API", True, f"Response time: {response.elapsed.total_seconds():.2f}s")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Quick Forecast Check API", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Quick Forecast Check API", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Quick Forecast Check API", False, f"Request failed: {e}")
            return False
    
    def test_trigger_worker_api(self):
        """Test Worker Trigger API"""
        test_data = {
            "ruleId": "test-rule-123",
            "reason": "user_request"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/trigger-worker",
                json=test_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if "success" in data and data["success"]:
                    self.log_test("Trigger Worker API", True, f"Worker triggered successfully")
                    return True
                else:
                    self.log_test("Trigger Worker API", False, f"Worker trigger failed: {data}")
                    return False
            else:
                self.log_test("Trigger Worker API", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Trigger Worker API", False, f"Request failed: {e}")
            return False
    
    def test_cost_monitoring_api(self):
        """Test Cost Monitoring API"""
        try:
            response = requests.get(f"{self.base_url}/api/cost-monitoring", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["totalAlerts", "activeAlerts", "priceCacheEntries", "estimatedMonthlyCost"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Cost Monitoring API", True, f"Found {data.get('totalAlerts', 0)} total alerts")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Cost Monitoring API", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Cost Monitoring API", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Cost Monitoring API", False, f"Request failed: {e}")
            return False
    
    def test_forecast_details_api(self):
        """Test Forecast Details API"""
        test_data = {
            "spot_id": "15bbdb3e-504a-4c50-8d34-6450104c22b3",
            "wave_min_m": 1.2,
            "wave_max_m": 2.5,
            "wind_max_kmh": 25,
            "forecast_window": 5
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/forecast-details?ruleId=test-rule-123",
                json=test_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["ruleId", "cachedAt", "forecastWindow", "criteria", "days"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Forecast Details API", True, f"Found {len(data.get('days', []))} forecast days")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Forecast Details API", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Forecast Details API", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Forecast Details API", False, f"Request failed: {e}")
            return False
    
    def test_worker_imports(self):
        """Test if worker modules can be imported"""
        try:
            # Test core worker imports
            from worker.core_worker import main, cache_price_data
            self.log_test("Worker Imports", True, "All worker modules imported successfully")
            return True
        except ImportError as e:
            self.log_test("Worker Imports", False, f"Import error: {e}")
            return False
        except Exception as e:
            self.log_test("Worker Imports", False, f"Unexpected error: {e}")
            return False
    
    def test_database_schema_files(self):
        """Test if database schema files exist"""
        schema_files = [
            "create_price_cache_schema.sql",
            "add_planning_logic_column.sql"
        ]
        
        all_exist = True
        for file in schema_files:
            if os.path.exists(file):
                self.log_test(f"Schema File: {file}", True)
            else:
                self.log_test(f"Schema File: {file}", False, "File not found")
                all_exist = False
        
        return all_exist
    
    def test_github_workflows(self):
        """Test if GitHub workflow files exist and are valid"""
        workflow_files = [
            ".github/workflows/worker.yml",
            ".github/workflows/quick-forecast-check.yml"
        ]
        
        all_exist = True
        for file in workflow_files:
            if os.path.exists(file):
                # Basic YAML validation
                try:
                    with open(file, 'r') as f:
                        content = f.read()
                        if 'name:' in content and 'on:' in content and 'jobs:' in content:
                            self.log_test(f"Workflow: {file}", True)
                        else:
                            self.log_test(f"Workflow: {file}", False, "Invalid YAML structure")
                            all_exist = False
                except Exception as e:
                    self.log_test(f"Workflow: {file}", False, f"Error reading file: {e}")
                    all_exist = False
            else:
                self.log_test(f"Workflow: {file}", False, "File not found")
                all_exist = False
        
        return all_exist
    
    def test_ui_components(self):
        """Test if UI components exist and have required props"""
        component_files = [
            "vercel-app/components/ForecastDetailsModal.tsx",
            "vercel-app/components/AlertRow.tsx"
        ]
        
        all_exist = True
        for file in component_files:
            if os.path.exists(file):
                try:
                    with open(file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Check for key features based on component type
                        if 'ForecastDetailsModal' in file:
                            # ForecastDetailsModal should have quickCheckResult and priceData
                            if 'quickCheckResult' in content and 'priceData' in content:
                                self.log_test(f"UI Component: {file}", True)
                            else:
                                self.log_test(f"UI Component: {file}", False, "Missing key features")
                                all_exist = False
                        elif 'AlertRow' in file:
                            # AlertRow should have ForecastDetailsModal integration
                            if 'ForecastDetailsModal' in content and 'planning_logic' in content:
                                self.log_test(f"UI Component: {file}", True)
                            else:
                                self.log_test(f"UI Component: {file}", False, "Missing key features")
                                all_exist = False
                        else:
                            self.log_test(f"UI Component: {file}", True)
                except Exception as e:
                    self.log_test(f"UI Component: {file}", False, f"Error reading file: {e}")
                    all_exist = False
            else:
                self.log_test(f"UI Component: {file}", False, "File not found")
                all_exist = False
        
        return all_exist
    
    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting Comprehensive System Testing")
        print("=" * 50)
        
        # Test 1: Server availability
        if not self.test_server_availability():
            print("\n⚠️  Server not available. Please start the development server with 'npm run dev'")
            print("Continuing with offline tests...\n")
        
        # Test 2: API endpoints (only if server is available)
        if self.test_server_availability():
            self.test_quick_forecast_check_api()
            self.test_trigger_worker_api()
            self.test_cost_monitoring_api()
            self.test_forecast_details_api()
        
        # Test 3: Worker components
        self.test_worker_imports()
        
        # Test 4: Database schema
        self.test_database_schema_files()
        
        # Test 5: GitHub workflows
        self.test_github_workflows()
        
        # Test 6: UI components
        self.test_ui_components()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"📈 Success Rate: {(self.passed / (self.passed + self.failed) * 100):.1f}%")
        
        if self.failed == 0:
            print("\n🎉 ALL TESTS PASSED! System is ready for deployment.")
        else:
            print(f"\n⚠️  {self.failed} tests failed. Please review and fix issues.")
        
        # Save detailed results
        with open("test_results.json", "w") as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to test_results.json")
        
        return self.failed == 0

if __name__ == "__main__":
    tester = SystemTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
