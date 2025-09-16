-- Add planning_logic column to alert_rules table
ALTER TABLE public.alert_rules 
ADD COLUMN IF NOT EXISTS planning_logic TEXT DEFAULT 'conservative' 
CHECK (planning_logic IN ('conservative', 'optimistic', 'aggressive'));

-- Add comment to document the column
COMMENT ON COLUMN public.alert_rules.planning_logic IS 'Planning logic for forecast evaluation: conservative (avg wave + max wind), optimistic (avg wave + avg wind), aggressive (min wave + avg wind)';
