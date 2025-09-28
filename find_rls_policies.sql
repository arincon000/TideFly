-- Find RLS policies that might be enforcing tier limits
-- Run this in Supabase SQL editor to identify the policies

-- 1. Check all RLS policies on alert_rules table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'alert_rules'
ORDER BY policyname;

-- 2. Check if there are any functions that enforce tier limits
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_definition ILIKE '%tier%' OR routine_definition ILIKE '%limit%' OR routine_definition ILIKE '%alert%');

-- 3. Check for triggers on alert_rules table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'alert_rules';

-- 4. Look for any constraints that might enforce limits
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'alert_rules'::regclass;

-- 5. Check if RLS is enabled on alert_rules table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'alert_rules';

-- 6. Look for any functions that might be called in RLS policies
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition ILIKE '%alert_rules%';
