# Epic 35 — Wave 30 SDR Shared Template Persistence

**Brief:** `docs/brief-epic-35-sdr-shared-template-persistence.md`  
**Status:** Done  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Persistir templates custom do SDR no backend para uso compartilhado e consistente entre ambientes.

## Stories

1. **35.1 — Backend templates schema + API contracts** (`@data-engineer`)  
Status: `Done`

2. **35.2 — SDR UI migration from localStorage to API** (`@dev`)  
Status: `Done`

3. **35.3 — QA Gate + PO Go/No-Go (shared templates)** (`@qa + @po`)  
Status: `Done`

## Execution Order

`35.1 -> 35.2 -> 35.3`

## Definition of Done

- [x] Templates SDR persistidos no backend
- [x] UI SDR usa API para listar/salvar/excluir templates
- [x] Testes backend e regressao dashboard verdes
- [x] Gate final QA/PO com decisao GO documentada
