# Epic 44 — Wave 39 SDR Template Access Request Handoff

**Brief:** `docs/brief-epic-44-sdr-template-access-request-handoff.md`  
**Status:** Ready for Dev  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Habilitar handoff in-product para solicitacao de acesso quando mutacoes de template SDR forem negadas.

## Stories

1. **44.1 — Backend access request initiation contract** (`@data-engineer`)  
Status: `Ready for Dev`

2. **44.2 — SDR dashboard access request action UX** (`@dev`)  
Status: `Ready for Dev`

3. **44.3 — QA Gate + PO Go/No-Go (access request handoff)** (`@qa + @po`)  
Status: `Ready for Dev`

## Execution Order

`44.1 -> 44.2 -> 44.3`

## Definition of Done

- [ ] Backend expoe contrato para iniciar solicitacao de acesso sem breaking change
- [ ] Dashboard SDR oferece acao de solicitacao no contexto de negacao
- [ ] Auditoria minima de solicitacao iniciada registrada
- [ ] Testes backend e regressao dashboard verdes
- [ ] Gate final QA/PO com decisao GO documentada
