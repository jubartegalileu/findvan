# Epic 38 — Wave 33 SDR Template Audit Trail

**Brief:** `docs/brief-epic-38-sdr-template-audit-trail.md`  
**Status:** Draft  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Garantir rastreabilidade de mudancas de templates SDR com auditoria historica por owner/template.

## Stories

1. **38.1 — Backend audit events for template mutations** (`@data-engineer`)  
Status: `Draft`

2. **38.2 — Dashboard visibility for template audit history** (`@dev`)  
Status: `Draft`

3. **38.3 — QA Gate + PO Go/No-Go (template audit trail)** (`@qa + @po`)  
Status: `Draft`

## Execution Order

`38.1 -> 38.2 -> 38.3`

## Definition of Done

- [ ] Backend registra eventos de auditoria para templates SDR
- [ ] Dashboard permite visualizar historico de alteracoes
- [ ] Testes backend e regressao dashboard verdes
- [ ] Gate final QA/PO com decisao GO documentada
