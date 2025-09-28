-- Create unlimited tier for testing
-- This adds 'unlimited' to the plan_tier_enum and sets up tier limits

-- Step 1: Add 'unlimited' to the plan_tier_enum
ALTER TYPE plan_tier_enum ADD VALUE 'unlimited';

-- Step 2: Create or update tier limits table (if it exists)
-- First, let's check if there's a tier_limits table and create it if needed
CREATE TABLE IF NOT EXISTS tier_limits (
    tier_name VARCHAR(50) PRIMARY KEY,
    max_active_alerts INTEGER NOT NULL DEFAULT 0,
    max_total_alerts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Insert tier limits for unlimited tier
INSERT INTO tier_limits (tier_name, max_active_alerts, max_total_alerts) 
VALUES ('unlimited', 999, 999)
ON CONFLICT (tier_name) 
DO UPDATE SET 
    max_active_alerts = 999,
    max_total_alerts = 999;

-- Step 4: Update your user to use the unlimited tier
-- Replace 'YOUR_USER_UUID' with your actual user UUID
UPDATE users 
SET plan_tier = 'unlimited', 
    plan_expires_at = '2026-12-31T23:59:59Z'
WHERE id = 'YOUR_USER_UUID';

-- Step 5: Verify the changes
SELECT 
    u.id,
    u.email,
    u.plan_tier,
    u.plan_expires_at,
    tl.max_active_alerts,
    tl.max_total_alerts
FROM users u
LEFT JOIN tier_limits tl ON u.plan_tier = tl.tier_name
WHERE u.id = 'YOUR_USER_UUID';
