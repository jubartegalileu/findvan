# Epic 27 — Wave 22 SDR Multi-Seller Foundation

**Brief:** `docs/brief-epic-27-multi-seller-foundation.md`  
**Status:** Done  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Habilitar fundação multi-vendedor no SDR com `assigned_to` operacional em API e UI, preservando contratos e estabilidade de regressão.

## Stories

1. **Story 27.1 — Backend Assignment API + Assignee Filters** (`@data-engineer`)  
Status: `Done`

2. **Story 27.2 — SDR UI Seller Filter Integration** (`@dev`)  
Status: `Done`

3. **Story 27.3 — QA Gate & PO Go/No-Go** (`@qa + @po`)  
Status: `Done`

## Execution Order

`27.1 -> 27.2 -> 27.3`

## Definition of Done

- [x] Queue e stats SDR aceitam filtro por `assigned_to`
- [x] Endpoint de atribuição SDR publicado e testado
- [x] Aba SDR filtra por vendedor e mantém estabilidade
- [x] Gates QA verdes com recomendação final documentada
