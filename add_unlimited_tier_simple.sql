-- Simple version: Just add unlimited tier and update your user
-- Replace 'YOUR_USER_UUID' with your actual user UUID

-- Step 1: Add 'unlimited' to the plan_tier_enum
ALTER TYPE plan_tier_enum ADD VALUE 'unlimited';

-- Step 2: Update your user to use the unlimited tier
UPDATE users 
SET plan_tier = 'unlimited', 
    plan_expires_at = '2026-12-31T23:59:59Z'
WHERE id = 'YOUR_USER_UUID';

-- Step 3: Verify the change
SELECT id, email, plan_tier, plan_expires_at 
FROM users 
WHERE id = 'YOUR_USER_UUID';
