# Epic 40 — Wave 35 SDR Template Actor Context Hardening

**Brief:** `docs/brief-epic-40-sdr-template-actor-context.md`  
**Status:** Done  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Endurecer contexto de actor para mutacoes de templates SDR, com regra explicita para escopo global.

## Stories

1. **40.1 — Backend explicit actor enforcement for template mutations** (`@data-engineer`)  
Status: `Done`

2. **40.2 — SDR dashboard actor propagation and UX visibility** (`@dev`)  
Status: `Done`

3. **40.3 — QA Gate + PO Go/No-Go (actor context hardening)** (`@qa + @po`)  
Status: `Done`

## Execution Order

`40.1 -> 40.2 -> 40.3`

## Definition of Done

- [x] Backend exige actor admin para mutacao global
- [x] Dashboard propaga actor efetivo nas mutacoes de template
- [x] Testes backend e regressao dashboard verdes
- [x] Gate final QA/PO com decisao GO documentada
