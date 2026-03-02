# Epic 41 — Wave 36 SDR Template Permission Precheck

**Brief:** `docs/brief-epic-41-sdr-template-permission-precheck.md`  
**Status:** Done  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Dar visibilidade e bloqueio preventivo de permissao em mutacoes de template SDR.

## Stories

1. **41.1 — Backend template permission precheck endpoint** (`@data-engineer`)  
Status: `Done`

2. **41.2 — SDR dashboard permission precheck UX** (`@dev`)  
Status: `Done`

3. **41.3 — QA Gate + PO Go/No-Go (permission precheck)** (`@qa + @po`)  
Status: `Done`

## Execution Order

`41.1 -> 41.2 -> 41.3`

## Definition of Done

- [x] Backend expõe precheck de permissao de templates
- [x] Dashboard sinaliza permissao e bloqueia mutacao negada
- [x] Testes backend e regressao dashboard verdes
- [x] Gate final QA/PO com decisao GO documentada
