# API Wave 2 — Story 6.2 (Scraper Automação)

Data de referência: 2026-02-28

## Scraper Schedules

- `GET /api/scraper/schedules`
  - Lista agendamentos.

- `POST /api/scraper/schedules`
  - Cria agendamento.
  - Payload:
    - `state`, `city`, `keywords`, `quantity`, `frequency`, `day_of_week?`, `execution_time`, `is_active`

- `PATCH /api/scraper/schedules/{id}`
  - Atualiza agendamento (inclusive toggle `is_active`).

- `DELETE /api/scraper/schedules/{id}`
  - Remove agendamento.

## Scraper Run (compatibilidade)

- `POST /api/scraper/google-maps`
  - Mantém payload anterior e aceita parâmetros avançados:
    - `ignore_existing`
    - `validate_phone`
    - `auto_cnpj`
    - `source`
