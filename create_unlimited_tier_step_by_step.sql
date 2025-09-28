-- Step 1: Add 'unlimited' to the plan_tier_enum
-- Run this first, then commit the transaction
ALTER TYPE plan_tier_enum ADD VALUE 'unlimited';

-- After running the above and committing, run this:

-- Step 2: Update your user to use the unlimited tier
-- Replace 'YOUR_USER_UUID' with your actual user UUID
UPDATE users 
SET plan_tier = 'unlimited', 
    plan_expires_at = '2026-12-31T23:59:59Z'
WHERE id = 'YOUR_USER_UUID';

-- Step 3: Verify the change
SELECT id, email, plan_tier, plan_expires_at 
FROM users 
WHERE id = 'YOUR_USER_UUID';
