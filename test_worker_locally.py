#!/usr/bin/env python3
"""
Test the worker locally with the test alerts
"""

import os
import sys
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")

def run_worker():
    """Run the worker locally"""
    print("🚀 Running worker locally...")
    
    # Set environment variables for testing
    env = os.environ.copy()
    env["DRY_RUN"] = "false"  # Actually send emails
    env["EMAIL_TO"] = "arincon000@gmail.com"  # Your email for testing
    env["BYPASS_COOLDOWN"] = "true"  # Bypass cooldown for testing
    
    try:
        # Run the worker
        result = subprocess.run([
            sys.executable, 
            "worker/core_worker.py"
        ], 
        env=env,
        capture_output=True,
        text=True,
        cwd=os.path.dirname(__file__)
        )
        
        print("📊 Worker Output:")
        print(result.stdout)
        
        if result.stderr:
            print("⚠️ Worker Errors:")
            print(result.stderr)
        
        print(f"✅ Worker completed with exit code: {result.returncode}")
        
    except Exception as e:
        print(f"❌ Error running worker: {e}")

def main():
    print("🧪 Testing worker with test alerts...")
    print("📧 Emails will be sent to: arincon000@gmail.com")
    print("🔧 Make sure you have:")
    print("   1. Run the test_setup.sql in Supabase")
    print("   2. Fresh forecast data is available")
    print("   3. Email credentials are configured")
    print()
    
    input("Press Enter to run the worker...")
    run_worker()

if __name__ == "__main__":
    main()
