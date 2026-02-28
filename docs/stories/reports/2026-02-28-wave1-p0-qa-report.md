# QA Report — Wave 1 P0 (Dashboard/Scraper/Leads)

**Date:** 2026-02-28
**Agent:** @qa
**Scope:** Stories 5.1, 5.2, 5.3
**Result:** PASS (com observações não bloqueantes)

## Executed Checks

1. Quality gates automatizados (repo root)
- `npm run lint` -> PASS
- `npm run typecheck` -> PASS
- `npm test` -> PASS
  - Scraper: 27/27
  - Backend API: 9/9
  - Dashboard (vitest): 3/3

2. Backend smoke (localhost)
- `GET /health` -> 200
- `GET /api/dashboard/kpis` -> 200
- `GET /api/dashboard/funnel-summary` -> 200
- `GET /api/dashboard/urgent-actions` -> 200
- `GET /api/scraper/stats` -> 200
- `GET /api/scraper/runs?limit=3` -> 200
- `GET /api/leads/?limit=3` -> 200
- `GET /api/leads/funnel/meta` -> 200

3. Frontend smoke (headless)
- Rotas validadas com Puppeteer:
  - `/dashboard` -> 200
  - `/scraper` -> 200
  - `/leads` -> 200
- Console errors: none
- Failed requests: none
- Evidence: `/tmp/findvan-qa-smoke/summary.json` e screenshots em `/tmp/findvan-qa-smoke/*.png`

4. Batch/scraper contract smoke
- `POST /api/leads/batch/export` -> 200
- `POST /api/leads/batch/campaign` -> 200
- `POST /api/leads/batch/status` (payload correto `new_status`) -> 200
- `GET /api/scraper/keywords` -> 200
- `PUT /api/scraper/keywords` -> 200

## Findings

1. Non-blocking: payload de `/api/leads/batch/status` exige `new_status` (não `status`), conforme API interna da Wave 1.
2. Non-blocking: smoke de batch alterou 1 lead para evidência de contrato (lead id `335`, campanha/status), sem impacto estrutural.
3. Non-blocking: smoke criou perfil de keywords de QA (`state=ZZ`, `city=QA City`).

## Regression Verdict

- Fluxo Scraper -> Leads -> Dashboard: OK
- Regressão funcional crítica P0: não encontrada
- Gate QA: **APROVADO**
