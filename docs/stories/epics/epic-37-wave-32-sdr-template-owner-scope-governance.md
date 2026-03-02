# Epic 37 — Wave 32 SDR Template Owner Scope Governance

**Brief:** `docs/brief-epic-37-sdr-template-owner-scope-governance.md`  
**Status:** Done  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Endurecer governanca de owner scope dos templates SDR para manter consistencia entre API e UI sem regressao operacional.

## Stories

1. **37.1 — Backend owner normalization + validation for templates** (`@data-engineer`)  
Status: `Done`

2. **37.2 — SDR UI owner scope UX hardening** (`@dev`)  
Status: `Done`

3. **37.3 — QA Gate + PO Go/No-Go (owner scope governance)** (`@qa + @po`)  
Status: `Done`

## Execution Order

`37.1 -> 37.2 -> 37.3`

## Definition of Done

- [x] Backend aplica normalizacao de owner para templates
- [x] UI SDR explicita escopo e reduz erro de input de equipe
- [x] Testes backend e regressao dashboard verdes
- [x] Gate final QA/PO com decisao GO documentada
