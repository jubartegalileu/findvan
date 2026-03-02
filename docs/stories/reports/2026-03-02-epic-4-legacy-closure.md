# 2026-03-02 — Epic 4 Legacy Closure (Leads v2)

## Decision

`CLOSED (legacy, superseded)`

## Rationale (PO/PM)

- Artefatos rastreáveis de execução existem para `4.1` e `4.2` (status `Done`).
- Stories planejadas `4.3` a `4.8` não existem no backlog como arquivos `4.x` e foram absorvidas por epics posteriores da trilha SDR/Funil.
- Para evitar duplicidade de roadmap e conflito de escopo, o Epic 4 foi encerrado como legado.

## QA Evidence

- Backend (score/leads):
  - `./venv/bin/python -m pytest -q tests/api/test_score_service.py tests/api/test_leads_api.py` -> PASS (`27 passed`)
- Dashboard regression:
  - `npm run test:regression:sdr-funil` -> PASS (`5 files / 12 tests`)

## Notes

- Encerramento não implica execução literal de todas as stories originalmente listadas no documento do Epic 4.
- Evolução válida segue pelos epics recentes (24-28+), já integrados ao stack atual.
