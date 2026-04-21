-- Run this SQL migration in your Supabase dashboard (SQL Editor)
-- This adds new columns to the tasks table for enhanced features

-- Add new columns to tasks table if they don't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'General';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS distractioncount INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS focusdata JSONB DEFAULT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_useremail_createdat ON tasks(useremail, createdat DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_useremail_status ON tasks(useremail, status);
CREATE INDEX IF NOT EXISTS idx_tasks_useremail_category ON tasks(useremail, category);

-- Update existing records to ensure consistency
UPDATE tasks SET category = 'General' WHERE category IS NULL;
UPDATE tasks SET distractioncount = 0 WHERE distractioncount IS NULL;

-- Verify the schema
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks';
