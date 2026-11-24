-- Add 'others' to the task_area enum type
-- This allows tasks with area='others' to be saved to Supabase

ALTER TYPE task_area ADD VALUE 'others';