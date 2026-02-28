-- Add contacted_at column to leads table
-- This tracks when a lead was first contacted
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMP NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_contacted_at ON leads(contacted_at);
