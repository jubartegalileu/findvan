# API Wave 1 P0 (Dashboard, Scraper, Leads)

Data de referência: 2026-02-28

## Dashboard

- `GET /api/dashboard/kpis`
  - Retorna os 6 KPIs do Dashboard v2.
  - Response: `{ status, kpis: { valid_leads, jobs_today, leads_24h, contacted_leads, reply_rate, monthly_conversions } }`

- `GET /api/dashboard/funnel-summary`
  - Retorna distribuição por estágio do funil.
  - Response: `{ status, summary: { total, conversion_rate, stages: [{ status, count, percentage }] } }`

- `GET /api/dashboard/urgent-actions`
  - Retorna alertas priorizados para operação.
  - Response: `{ status, urgent_actions: { alerts: [{ id, label, color, priority, count, funnel }], all_clear } }`

## Scraper

- `POST /api/scraper/google-maps`
  - Executa coleta por cidade/UF com suporte a múltiplas keywords.
  - Payload: `{ city?, state, max_results, keywords? }`
  - Response: `{ status, result: { total, unique, duplicates, inserted, db_duplicates, keywords, keyword_results, pipeline, feedback } }`

- `GET /api/scraper/keywords?state={UF}&city={nome}`
  - Lê perfil de keywords salvo para cidade/UF.
  - Response: `{ status, profile: { state, city, keywords, source } }`

- `PUT /api/scraper/keywords`
  - Salva/atualiza perfil de keywords por cidade/UF.
  - Payload: `{ state, city, keywords }`
  - Response: `{ status, profile: { state, city, keywords } }`

## Leads

- `PATCH /api/leads/{id}/funnel-status`
  - Atualiza status de funil de um lead.

- `PATCH /api/leads/{id}/status`
  - Alias compatível com o PRD para `funnel-status`.

- `GET /api/leads/{id}/transitions`
  - Retorna transições válidas a partir do status atual.

- `POST /api/leads/batch/status`
  - Atualiza status em lote.
  - Payload: `{ ids, new_status, loss_reason?, loss_reason_other?, author? }`

- `POST /api/leads/batch/campaign`
  - Atualiza campanha/status de campanha em lote.
  - Payload: `{ ids, campaign_status }`

- `POST /api/leads/batch/export`
  - Retorna dados dos leads selecionados para exportação CSV.
  - Payload: `{ ids }`

- `POST /api/leads/batch/delete`
  - Soft delete em lote.
  - Payload: `{ ids }`
