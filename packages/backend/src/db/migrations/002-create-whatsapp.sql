-- Module 4: WhatsApp Integration - Database Schema
-- Created: 2026-02-27

-- Table: templates (Message templates for campaigns)
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  variables JSONB, -- Array of variable names: ["name", "company", "city"]
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_default ON templates(is_default);

-- Trigger: auto-update updated_at for templates
CREATE OR REPLACE FUNCTION update_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_templates_timestamp_trigger ON templates;
CREATE TRIGGER update_templates_timestamp_trigger
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_templates_timestamp();

-- Table: campaigns (Message campaigns with filtering and scheduling)
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  filters JSONB, -- {"city": "São Paulo", "source": "google_maps", "is_valid": true}
  schedule_config JSONB, -- {"type": "immediate", "time": "14:00", "daysOfWeek": [1,2,3]}
  rate_limit_per_minute INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, paused, completed
  stats JSONB, -- {"total": 100, "sent": 50, "delivered": 45, "failed": 5, "responded": 10}
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_template ON campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns(created_at DESC);

-- Trigger: auto-update updated_at for campaigns
CREATE OR REPLACE FUNCTION update_campaigns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_campaigns_timestamp_trigger ON campaigns;
CREATE TRIGGER update_campaigns_timestamp_trigger
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_campaigns_timestamp();

-- Table: message_queue (Message queue with status tracking)
CREATE TABLE IF NOT EXISTS message_queue (
  id BIGSERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
  message_text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed, read, responded
  twilio_message_id VARCHAR(100),
  attempt_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_reason TEXT,
  metadata JSONB, -- {"campaign_id": 1, "variables_used": {...}}
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON message_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_lead ON message_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_queue_campaign ON message_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_queue_created ON message_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_status_created ON message_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_phone ON message_queue(phone);
CREATE INDEX IF NOT EXISTS idx_queue_twilio_id ON message_queue(twilio_message_id);

-- Trigger: auto-update updated_at for message_queue
CREATE OR REPLACE FUNCTION update_message_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_message_queue_timestamp_trigger ON message_queue;
CREATE TRIGGER update_message_queue_timestamp_trigger
  BEFORE UPDATE ON message_queue
  FOR EACH ROW EXECUTE FUNCTION update_message_queue_timestamp();

-- Table: message_webhook_logs (Webhook events from Twilio)
CREATE TABLE IF NOT EXISTS message_webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  twilio_message_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- sent, delivered, failed, read, incoming
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_twilio_id ON message_webhook_logs(twilio_message_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON message_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON message_webhook_logs(created_at DESC);

-- Insert default templates
INSERT INTO templates (name, content, variables, is_default) VALUES
  ('Greeting', 'Olá {{name}}, tudo bem? 👋', '["name"]', true),
  ('Company Pitch', 'Oi {{name}}, somos a FindVan! Ajudamos escolas como a {{company}} a gerenciar transportes. Posso marcar uma conversa? 🚌', '["name", "company"]', true),
  ('City Specific', 'Olá {{name}}! Vimos que vocês ficam em {{city}}. Podemos ajudar com soluções de transporte escolar. Interessado? ✨', '["name", "city"]', true),
  ('Follow-up', 'Oi {{name}}, só para confirmar se recebeu minha mensagem anterior. Continuo à disposição! 😊', '["name"]', true),
  ('Callback Request', 'Olá {{name}}, gostaria de marcar um callback para discutir sobre transporte escolar. Qual é o melhor horário? 📞', '["name"]', true),
  ('Social Proof', 'Oi {{name}}, já estamos ajudando 50+ escolas em {{city}} a economizar em transporte. Quer conhecer nossos cases? 📊', '["name", "city"]', true),
  ('Limited Offer', 'Olá {{name}}, estamos oferecendo uma consultoria grátis para {{company}} este mês. Aproveita! 🎁', '["name", "company"]', true),
  ('Question', 'Oi {{name}}, qual é o maior desafio de {{company}} em relação a transporte? Adoraria ouvir sua perspectiva! 🤔', '["name", "company"]', true),
  ('Video Demo', 'Olá {{name}}, gravei um vídeo mostrando como a FindVan funciona. Quer assistir? 🎬 [link]', '["name"]', true),
  ('Closure', 'Olá {{name}}, foi um prazer conversar com você. Ficou em aberto qualquer dúvida?', '["name"]', true)
ON CONFLICT (name) DO NOTHING;

-- Verify migration
SELECT
  'templates'::text AS table_name, COUNT(*) AS record_count
FROM templates
UNION ALL
SELECT 'campaigns'::text, COUNT(*) FROM campaigns
UNION ALL
SELECT 'message_queue'::text, COUNT(*) FROM message_queue
UNION ALL
SELECT 'message_webhook_logs'::text, COUNT(*) FROM message_webhook_logs;
