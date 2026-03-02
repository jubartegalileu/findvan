# Epic 31 — Wave 26 SDR Bulk Next Action Scheduling

**Brief:** `docs/brief-epic-31-sdr-bulk-next-action-scheduling.md`  
**Status:** Done  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Permitir planejamento operacional em lote no SDR para descrição, data/hora e cadência da próxima ação.

## Stories

1. **31.1 — Batch scheduling API contract + UI wiring** (`@data-engineer` + `@dev`)  
Status: `Done`

2. **31.2 — UX guard rails for partial batch scheduling** (`@dev`)  
Status: `Done`

3. **31.3 — QA Gate + PO Go/No-Go (bulk scheduling)** (`@qa + @po`)  
Status: `Done`

## Execution Order

`31.1 -> 31.2 -> 31.3`

## Definition of Done

- [x] Batch scheduling por endpoint SDR validado
- [x] UI SDR suporta agendamento em lote com descrição/data/cadência
- [x] Guard rails de sucesso parcial e mensagens unificadas aplicados
- [x] Gate final QA/PO com decisão GO documentada
