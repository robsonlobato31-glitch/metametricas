-- Drop existing constraint and add new one with 'region'
ALTER TABLE metric_breakdowns 
DROP CONSTRAINT IF EXISTS metric_breakdowns_breakdown_type_check;

ALTER TABLE metric_breakdowns 
ADD CONSTRAINT metric_breakdowns_breakdown_type_check 
CHECK (breakdown_type = ANY (ARRAY['age', 'gender', 'device_platform', 'publisher_platform', 'region']));