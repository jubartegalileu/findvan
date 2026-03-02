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

SDR_ACTIVITIES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS sdr_activities (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to TEXT,
  prospect_status TEXT NOT NULL DEFAULT 'nao_contatado',
  next_action_date TIMESTAMP,
  next_action_description TEXT,
  cadence_step INTEGER NOT NULL DEFAULT 0,
  last_contact_at TIMESTAMP,
  contact_count INTEGER NOT NULL DEFAULT 0,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sdr_prospect_status CHECK (
    prospect_status IN ('nao_contatado', 'contatado', 'cliente', 'fora_do_ramo')
  ),
  CONSTRAINT uq_sdr_lead UNIQUE (lead_id)
);
CREATE INDEX IF NOT EXISTS idx_sdr_next_action ON sdr_activities(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sdr_prospect_status ON sdr_activities(prospect_status);
CREATE INDEX IF NOT EXISTS idx_sdr_active_queue ON sdr_activities(next_action_date, prospect_status, lead_id);
"""

PIPELINE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS pipeline (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  funnel_status TEXT NOT NULL DEFAULT 'novo',
  entered_stage_at TIMESTAMP NOT NULL DEFAULT NOW(),
  loss_reason TEXT,
  loss_reason_detail TEXT,
  stage_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pipeline_funnel_status CHECK (
    funnel_status IN ('novo', 'contactado', 'respondeu', 'interessado', 'convertido', 'perdido')
  ),
  CONSTRAINT uq_pipeline_lead UNIQUE (lead_id)
);
CREATE INDEX IF NOT EXISTS idx_pipeline_status_entered ON pipeline(funnel_status, entered_stage_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_active_status ON pipeline(funnel_status, lead_id)
  WHERE funnel_status IN ('novo', 'contactado', 'respondeu', 'interessado');
"""

SDR_BULK_TEMPLATES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS sdr_bulk_templates (
  id BIGSERIAL PRIMARY KEY,
  owner VARCHAR(100) NOT NULL DEFAULT 'all',
  name VARCHAR(120) NOT NULL,
  next_action_description TEXT,
  cadence_days INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sdr_bulk_templates_cadence_days CHECK (cadence_days BETWEEN 1 AND 30),
  CONSTRAINT uq_sdr_bulk_templates_owner_name UNIQUE (owner, name)
);
ALTER TABLE sdr_bulk_templates ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sdr_bulk_templates ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_sdr_bulk_templates_owner ON sdr_bulk_templates(owner, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_sdr_bulk_templates_owner_order ON sdr_bulk_templates(owner, is_favorite DESC, sort_order ASC, id DESC);
"""

TIMESTAMP_AND_TRIGGER_SQL = """
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sdr_activities_update_timestamp_trigger ON sdr_activities;
CREATE TRIGGER sdr_activities_update_timestamp_trigger
  BEFORE UPDATE ON sdr_activities
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS pipeline_update_timestamp_trigger ON pipeline;
CREATE TRIGGER pipeline_update_timestamp_trigger
  BEFORE UPDATE ON pipeline
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE FUNCTION auto_create_pipeline_and_sdr()
RETURNS TRIGGER AS $$
DECLARE
  normalized_funnel TEXT;
  normalized_prospect TEXT;
BEGIN
  normalized_funnel := LOWER(COALESCE(NULLIF(TRIM(NEW.funnel_status), ''), 'novo'));
  IF normalized_funnel NOT IN ('novo', 'contactado', 'respondeu', 'interessado', 'convertido', 'perdido') THEN
    normalized_funnel := 'novo';
  END IF;

  normalized_prospect := LOWER(COALESCE(NULLIF(TRIM(NEW.prospect_status), ''), 'nao_contatado'));
  IF normalized_prospect NOT IN ('nao_contatado', 'contatado', 'cliente', 'fora_do_ramo') THEN
    normalized_prospect := 'nao_contatado';
  END IF;

  INSERT INTO pipeline (
    lead_id,
    funnel_status,
    entered_stage_at,
    loss_reason
  )
  VALUES (
    NEW.id,
    normalized_funnel,
    COALESCE(NEW.updated_at, NEW.created_at, NOW()),
    NEW.loss_reason
  )
  ON CONFLICT (lead_id) DO NOTHING;

  INSERT INTO sdr_activities (
    lead_id,
    prospect_status,
    next_action_date,
    next_action_description
  )
  VALUES (
    NEW.id,
    normalized_prospect,
    NEW.next_action_date,
    NEW.next_action_description
  )
  ON CONFLICT (lead_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_auto_create_pipeline_and_sdr_trigger ON leads;
CREATE TRIGGER leads_auto_create_pipeline_and_sdr_trigger
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION auto_create_pipeline_and_sdr();

INSERT INTO pipeline (lead_id, funnel_status, entered_stage_at, loss_reason)
SELECT
  l.id,
  CASE
    WHEN LOWER(COALESCE(NULLIF(TRIM(l.funnel_status), ''), 'novo')) IN ('novo', 'contactado', 'respondeu', 'interessado', 'convertido', 'perdido')
      THEN LOWER(COALESCE(NULLIF(TRIM(l.funnel_status), ''), 'novo'))
    ELSE 'novo'
  END,
  COALESCE(l.updated_at, l.created_at, NOW()),
  l.loss_reason
FROM leads l
LEFT JOIN pipeline p ON p.lead_id = l.id
WHERE p.lead_id IS NULL;

INSERT INTO sdr_activities (lead_id, prospect_status, next_action_date, next_action_description)
SELECT
  l.id,
  CASE
    WHEN LOWER(COALESCE(NULLIF(TRIM(l.prospect_status), ''), 'nao_contatado')) IN ('nao_contatado', 'contatado', 'cliente', 'fora_do_ramo')
      THEN LOWER(COALESCE(NULLIF(TRIM(l.prospect_status), ''), 'nao_contatado'))
    ELSE 'nao_contatado'
  END,
  l.next_action_date,
  l.next_action_description
FROM leads l
LEFT JOIN sdr_activities s ON s.lead_id = l.id
WHERE s.lead_id IS NULL;
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

METRICS_GOVERNANCE_SUGGESTIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS metrics_governance_suggestions (
  id BIGSERIAL PRIMARY KEY,
  state_key VARCHAR(100) NOT NULL DEFAULT 'global',
  suggestion_id VARCHAR(120) NOT NULL UNIQUE,
  component VARCHAR(50) NOT NULL DEFAULT 'global',
  model_version VARCHAR(20) NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  rationale TEXT NOT NULL,
  expected_impact TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  proposed_thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  diffs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMP,
  decided_by VARCHAR(100),
  decision_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_metrics_governance_suggestions_state_created
  ON metrics_governance_suggestions(state_key, generated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_governance_suggestions_status
  ON metrics_governance_suggestions(status, generated_at DESC, id DESC);
"""

METRICS_GOVERNANCE_DECISIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS metrics_governance_decisions (
  id BIGSERIAL PRIMARY KEY,
  state_key VARCHAR(100) NOT NULL DEFAULT 'global',
  decision_id VARCHAR(120) NOT NULL UNIQUE,
  suggestion_id VARCHAR(120) NOT NULL,
  decision VARCHAR(20) NOT NULL,
  author VARCHAR(100) NOT NULL,
  reason TEXT,
  proposed_diffs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metrics_governance_decisions_state_created
  ON metrics_governance_decisions(state_key, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_governance_decisions_suggestion
  ON metrics_governance_decisions(suggestion_id, created_at DESC, id DESC);
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

OPERATIONAL_PLAYBOOKS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS operational_playbooks (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  component VARCHAR(50) NOT NULL,
  trigger TEXT NOT NULL,
  preconditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  rollback JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operational_playbooks_component ON operational_playbooks(component);
"""

OPERATIONAL_PLAYBOOK_EXECUTIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS operational_playbook_executions (
  id BIGSERIAL PRIMARY KEY,
  playbook_key VARCHAR(120) NOT NULL,
  incident_id BIGINT,
  author VARCHAR(100) NOT NULL DEFAULT 'system',
  result VARCHAR(30) NOT NULL DEFAULT 'started',
  note TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_playbook_exec_playbook ON operational_playbook_executions(playbook_key, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_playbook_exec_incident ON operational_playbook_executions(incident_id);
"""

OPERATIONAL_PLAYBOOK_READINESS_CHECKS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS operational_playbook_readiness_checks (
  id BIGSERIAL PRIMARY KEY,
  check_id VARCHAR(120) NOT NULL,
  playbook_key VARCHAR(120) NOT NULL,
  component VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'warn',
  severity VARCHAR(20) NOT NULL DEFAULT 'warn',
  owner VARCHAR(100),
  has_recent_execution BOOLEAN NOT NULL DEFAULT false,
  last_execution_at TIMESTAMP,
  recommendation TEXT NOT NULL,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_playbook_readiness_check_created
  ON operational_playbook_readiness_checks(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_playbook_readiness_check_id
  ON operational_playbook_readiness_checks(check_id, created_at DESC, id DESC);
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
            cur.execute(SDR_ACTIVITIES_TABLE_SQL)
            cur.execute(PIPELINE_TABLE_SQL)
            cur.execute(SDR_BULK_TEMPLATES_TABLE_SQL)
            cur.execute(TIMESTAMP_AND_TRIGGER_SQL)
            cur.execute(MESSAGING_RECEIPTS_TABLE_SQL)
            cur.execute(JOB_LOCKS_TABLE_SQL)
            cur.execute(RETENTION_STATUS_TABLE_SQL)
            cur.execute(ALERTING_STATE_TABLE_SQL)
            cur.execute(ALERTING_RECENT_EVENTS_TABLE_SQL)
            cur.execute(METRICS_GOVERNANCE_STATE_TABLE_SQL)
            cur.execute(METRICS_GOVERNANCE_AUDIT_TABLE_SQL)
            cur.execute(METRICS_GOVERNANCE_SUGGESTIONS_TABLE_SQL)
            cur.execute(METRICS_GOVERNANCE_DECISIONS_TABLE_SQL)
            cur.execute(OPERATIONAL_INCIDENTS_TABLE_SQL)
            cur.execute(OPERATIONAL_PLAYBOOKS_TABLE_SQL)
            cur.execute(OPERATIONAL_PLAYBOOK_EXECUTIONS_TABLE_SQL)
            cur.execute(OPERATIONAL_PLAYBOOK_READINESS_CHECKS_TABLE_SQL)
        conn.commit()
