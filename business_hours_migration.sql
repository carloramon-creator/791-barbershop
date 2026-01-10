-- Add opening_hours column to tenants table with Overtime Tolerance
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{
    "work_days": [1, 2, 3, 4, 5, 6], 
    "start_time": "09:00", 
    "end_time": "19:00", 
    "lunch_duration": 0,
    "overtime_tolerance_percent": 0
}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.tenants.opening_hours IS 'Stores weekly schedule configuration including overtime tolerance';
