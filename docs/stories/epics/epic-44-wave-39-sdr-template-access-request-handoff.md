# Epic 44 — Wave 39 SDR Template Access Request Handoff

**Brief:** `docs/brief-epic-44-sdr-template-access-request-handoff.md`  
**Status:** Done  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Habilitar handoff in-product para solicitacao de acesso quando mutacoes de template SDR forem negadas.

## Stories

1. **44.1 — Backend access request initiation contract** (`@data-engineer`)  
Status: `Done`

2. **44.2 — SDR dashboard access request action UX** (`@dev`)  
Status: `Done`

3. **44.3 — QA Gate + PO Go/No-Go (access request handoff)** (`@qa + @po`)  
Status: `Done`

## Execution Order

`44.1 -> 44.2 -> 44.3`

## Definition of Done

- [x] Backend expoe contrato para iniciar solicitacao de acesso sem breaking change
- [x] Dashboard SDR oferece acao de solicitacao no contexto de negacao
- [x] Auditoria minima de solicitacao iniciada registrada
- [x] Testes backend e regressao dashboard verdes
- [x] Gate final QA/PO com decisao GO documentada
