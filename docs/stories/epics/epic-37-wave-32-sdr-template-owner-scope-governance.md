# Epic 37 — Wave 32 SDR Template Owner Scope Governance

**Brief:** `docs/brief-epic-37-sdr-template-owner-scope-governance.md`  
**Status:** Draft  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Endurecer governanca de owner scope dos templates SDR para manter consistencia entre API e UI sem regressao operacional.

## Stories

1. **37.1 — Backend owner normalization + validation for templates** (`@data-engineer`)  
Status: `Draft`

2. **37.2 — SDR UI owner scope UX hardening** (`@dev`)  
Status: `Draft`

3. **37.3 — QA Gate + PO Go/No-Go (owner scope governance)** (`@qa + @po`)  
Status: `Draft`

## Execution Order

`37.1 -> 37.2 -> 37.3`

## Definition of Done

- [ ] Backend aplica normalizacao de owner para templates
- [ ] UI SDR explicita escopo e reduz erro de input de equipe
- [ ] Testes backend e regressao dashboard verdes
- [ ] Gate final QA/PO com decisao GO documentada
