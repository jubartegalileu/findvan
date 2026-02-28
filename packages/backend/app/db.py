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

SCRAPER_SCHEDULES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS scraper_schedules (
  id BIGSERIAL PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  city TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 50,
  frequency VARCHAR(20) NOT NULL,
  day_of_week INTEGER,
  execution_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scraper_schedules_active ON scraper_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_scraper_schedules_state_city ON scraper_schedules(state, city);
"""

LEAD_NOTES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS lead_notes (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at DESC);
"""

LEAD_TAGS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS lead_tags (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lead_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag ON lead_tags(tag);
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

MESSAGING_RECEIPTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS messaging_receipts (
  id BIGSERIAL PRIMARY KEY,
  version VARCHAR(10) NOT NULL DEFAULT '1.1.0',
  event_type VARCHAR(30) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  lead_id VARCHAR(100),
  campaign_id VARCHAR(100),
  destination VARCHAR(100),
  occurred_at TIMESTAMP NOT NULL,
  status_detail TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(external_id, provider, event_type)
);
CREATE INDEX IF NOT EXISTS idx_messaging_receipts_received_at ON messaging_receipts(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messaging_receipts_external ON messaging_receipts(external_id);
CREATE INDEX IF NOT EXISTS idx_messaging_receipts_provider_event ON messaging_receipts(provider, event_type);
"""

JOB_LOCKS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS distributed_job_locks (
  lock_name VARCHAR(100) PRIMARY KEY,
  owner_id VARCHAR(255) NOT NULL,
  acquired_at TIMESTAMP NOT NULL DEFAULT NOW(),
  heartbeat_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_distributed_job_locks_owner ON distributed_job_locks(owner_id);
CREATE INDEX IF NOT EXISTS idx_distributed_job_locks_expires ON distributed_job_locks(expires_at);
"""

RETENTION_STATUS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS retention_job_status (
  job_name VARCHAR(100) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  running BOOLEAN NOT NULL DEFAULT false,
  interval_seconds INTEGER NOT NULL DEFAULT 300,
  retention_receipts_days INTEGER NOT NULL DEFAULT 30,
  retention_activity_days INTEGER NOT NULL DEFAULT 30,
  owner_id VARCHAR(255),
  last_run_at TIMESTAMP,
  last_success_at TIMESTAMP,
  last_duration_ms INTEGER NOT NULL DEFAULT 0,
  last_deleted_receipts INTEGER NOT NULL DEFAULT 0,
  last_deleted_activity INTEGER NOT NULL DEFAULT 0,
  last_deleted_total INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  run_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

ALERTING_STATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS alerting_state (
  state_key VARCHAR(100) PRIMARY KEY,
  suppressed_count INTEGER NOT NULL DEFAULT 0,
  queued_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_sent_at TIMESTAMP,
  last_fallback_at TIMESTAMP,
  last_suppressed_at TIMESTAMP,
  cooldown_until_by_key JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

ALERTING_RECENT_EVENTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS alerting_recent_events (
  id BIGSERIAL PRIMARY KEY,
  state_key VARCHAR(100) NOT NULL DEFAULT 'global',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  delivery VARCHAR(50) NOT NULL,
  reason TEXT,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_alerting_recent_events_state_created
  ON alerting_recent_events(state_key, created_at DESC, id DESC);
"""

METRICS_GOVERNANCE_STATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS metrics_governance_state (
  state_key VARCHAR(100) PRIMARY KEY,
  thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
"""

METRICS_GOVERNANCE_AUDIT_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS metrics_governance_audit (
  id BIGSERIAL PRIMARY KEY,
  state_key VARCHAR(100) NOT NULL DEFAULT 'global',
  audit_id VARCHAR(100) NOT NULL,
  author VARCHAR(100) NOT NULL,
  source VARCHAR(100) NOT NULL DEFAULT 'dashboard',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  diffs JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_metrics_governance_audit_state_created
  ON metrics_governance_audit(state_key, created_at DESC, id DESC);
"""

OPERATIONAL_INCIDENTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS operational_incidents (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  title VARCHAR(255) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operational_incidents_created ON operational_incidents(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_operational_incidents_source ON operational_incidents(source);
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
            cur.execute(SCRAPER_SCHEDULES_TABLE_SQL)
            cur.execute(LEAD_NOTES_TABLE_SQL)
            cur.execute(LEAD_TAGS_TABLE_SQL)
            cur.execute(LEAD_INTERACTIONS_TABLE_SQL)
            cur.execute(MESSAGING_RECEIPTS_TABLE_SQL)
            cur.execute(JOB_LOCKS_TABLE_SQL)
            cur.execute(RETENTION_STATUS_TABLE_SQL)
            cur.execute(ALERTING_STATE_TABLE_SQL)
            cur.execute(ALERTING_RECENT_EVENTS_TABLE_SQL)
            cur.execute(METRICS_GOVERNANCE_STATE_TABLE_SQL)
            cur.execute(METRICS_GOVERNANCE_AUDIT_TABLE_SQL)
            cur.execute(OPERATIONAL_INCIDENTS_TABLE_SQL)
        conn.commit()
