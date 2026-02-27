-- Migration: Create leads table
-- Description: PostgreSQL schema for storing OSINT scraped leads
-- Created: 2026-02-27

-- Drop table if exists (for development/testing)
-- DROP TABLE IF EXISTS leads CASCADE;

CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,

  -- Source information
  source TEXT NOT NULL,

  -- Basic information
  name TEXT NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(255),
  address TEXT,
  city TEXT NOT NULL,

  -- Company information
  company_name TEXT,
  cnpj VARCHAR(20),
  url TEXT,

  -- Timestamps
  captured_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Status flags
  is_valid BOOLEAN DEFAULT true,
  is_duplicate BOOLEAN DEFAULT false,

  -- Constraints
  UNIQUE(phone, source),
  CONSTRAINT valid_phone_length CHECK (phone IS NULL OR LENGTH(phone) = 11)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_valid ON leads(is_valid);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone_source ON leads(phone, source);
CREATE INDEX IF NOT EXISTS idx_leads_city_valid ON leads(city, is_valid);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Create function to mark duplicates by phone
CREATE OR REPLACE FUNCTION mark_duplicates()
RETURNS TABLE (phone varchar, duplicate_count bigint) AS $$
BEGIN
  RETURN QUERY
  UPDATE leads
  SET is_duplicate = TRUE
  WHERE phone IN (
    SELECT phone
    FROM leads
    WHERE phone IS NOT NULL
    GROUP BY phone
    HAVING COUNT(*) > 1
  )
  RETURNING leads.phone, COUNT(*)::bigint;
END;
$$ LANGUAGE plpgsql;

-- Create view for duplicate groups
CREATE OR REPLACE VIEW duplicate_leads AS
SELECT
  phone,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as lead_ids,
  ARRAY_AGG(name) as names,
  ARRAY_AGG(source) as sources
FROM leads
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Add comment to table
COMMENT ON TABLE leads IS 'Stores OSINT scraped leads from various sources (Google Maps, Facebook, LinkedIn, etc.)';
COMMENT ON COLUMN leads.source IS 'Source of the lead (e.g., google_maps, facebook, cnpj_database)';
COMMENT ON COLUMN leads.phone IS 'Phone number in Brazilian format (11 digits)';
COMMENT ON COLUMN leads.is_valid IS 'Whether the lead passed validation (phone, email, address format)';
COMMENT ON COLUMN leads.is_duplicate IS 'Whether the lead is marked as duplicate based on phone number';
