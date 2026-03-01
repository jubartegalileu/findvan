# API Wave 2 — Story 6.1 (Dashboard Analytics)

Data de referência: 2026-02-28

## Dashboard

- `GET /api/dashboard/weekly-performance`
  - Retorna métricas agregadas dos últimos 7 dias para o widget de performance.
  - Response:
    - `status`
    - `performance.has_data`
    - `performance.messages_sent`
    - `performance.delivery_rate`
    - `performance.reply_rate`
    - `performance.block_rate`
    - `performance.labels` (7 rótulos)
    - `performance.series` (7 valores)

## Activity

- `GET /api/activity?limit=20`
  - Retorna timeline unificada de eventos recentes.
  - Response:
    - `status`
    - `events[]` com:
      - `id`
      - `type` (`scraper`, `msg_sent`, `msg_received`, `status_change`, `campaign`)
      - `title`
      - `description`
      - `created_at`
