# Architect Gate — API Contract & Backward Compatibility (Wave 1 P0)

**Date:** 2026-02-28
**Agent:** @architect
**Scope:** Stories 5.1, 5.2, 5.3
**Result:** PASS

## Contract Validation

OpenAPI paths encontrados (subset relevante):
- `/api/dashboard/kpis`
- `/api/dashboard/funnel-summary`
- `/api/dashboard/urgent-actions`
- `/api/scraper/google-maps`
- `/api/scraper/keywords`
- `/api/scraper/runs`
- `/api/scraper/stats`
- `/api/leads/batch/status`
- `/api/leads/batch/campaign`
- `/api/leads/batch/export`
- `/api/leads/batch/delete`
- `/api/leads/{lead_id}/funnel-status`
- `/api/leads/{lead_id}/status` (alias)
- `/api/leads/{lead_id}/transitions`

Contrato documentado em: `docs/API-WAVE1-P0.md`.

## Backward Compatibility Review

1. Leads status API:
- Mantido endpoint principal `PATCH /api/leads/{id}/funnel-status`.
- Adicionado alias `PATCH /api/leads/{id}/status` para compatibilidade com nomenclatura do PRD.

2. Schema changes:
- Mudanças aditivas em `leads` (`next_action_date`, `next_action_description`, `deleted_at`).
- Nova tabela `scraper_keyword_profiles`.
- Estratégia é backward-compatible para leitura/escrita existente.

3. Frontend API base:
- Normalização de base URL em `packages/dashboard/src/lib/apiBase.js` reduz risco de regressão de `localhost:5173` apontando para API errada.

## Architectural Notes

1. Divergência nominal pequena com PRD em batch status:
- API implementada usa `new_status` no payload (mais explícito).
- Recomendação: manter `new_status` como canônico e, se necessário, aceitar `status` como alias futuro.

2. Soft delete:
- Filtragem de `deleted_at IS NULL` aplicada em listagens principais de leads.

## Decision

- Gate de arquitetura: **APROVADO**
- Sem bloqueios para encerramento da Wave 1 P0 e início da Wave 2 P1.
