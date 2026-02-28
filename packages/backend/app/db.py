from contextlib import contextmanager
import psycopg
from .config import DATABASE_URL


LEADS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(255),
  address TEXT,
  city TEXT NOT NULL,
  state VARCHAR(2),
  company_name TEXT,
  cnpj VARCHAR(20),
  url TEXT,
  score INTEGER DEFAULT 0,
  funnel_status VARCHAR(20) DEFAULT 'novo',
  loss_reason VARCHAR(100),
  next_action_date TIMESTAMP,
  next_action_description TEXT,
  deleted_at TIMESTAMP,
  prospect_status TEXT DEFAULT 'nao_contatado',
  prospect_notes TEXT,
  campaign_status TEXT,
  captured_at TIMESTAMP,
  is_valid BOOLEAN DEFAULT true,
  is_duplicate BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(phone, source)
);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS funnel_status VARCHAR(20) DEFAULT 'novo';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS loss_reason VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action_description TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS prospect_status TEXT DEFAULT 'nao_contatado';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS prospect_notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_status TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_valid ON leads(is_valid);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_funnel_status ON leads(funnel_status);
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at);
"""

SCRAPER_RUNS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS scraper_runs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'google_maps',
  city TEXT NOT NULL,
  state VARCHAR(2),
  target_count INTEGER NOT NULL DEFAULT 100,
  total_count INTEGER NOT NULL DEFAULT 0,
  unique_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  db_duplicate_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_created ON scraper_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_city_state ON scraper_runs(city, state);
"""

SCRAPER_KEYWORD_PROFILES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS scraper_keyword_profiles (
  id BIGSERIAL PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  city TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(state, city)
);
CREATE INDEX IF NOT EXISTS idx_scraper_keyword_profiles_state_city ON scraper_keyword_profiles(state, city);
"""

LEAD_INTERACTIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS lead_interactions (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  content TEXT,
  metadata JSONB,
  author VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON lead_interactions(created_at DESC);
"""


@contextmanager
def get_connection():
    conn = psycopg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


def ensure_schema():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(LEADS_TABLE_SQL)
            cur.execute(SCRAPER_RUNS_TABLE_SQL)
            cur.execute(SCRAPER_KEYWORD_PROFILES_TABLE_SQL)
            cur.execute(LEAD_INTERACTIONS_TABLE_SQL)
        conn.commit()
