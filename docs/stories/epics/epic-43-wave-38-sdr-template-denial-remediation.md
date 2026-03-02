# Epic 43 — Wave 38 SDR Template Denial Remediation

**Brief:** `docs/brief-epic-43-sdr-template-denial-remediation.md`  
**Status:** Done  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Transformar bloqueios de permissao de templates SDR em fluxo guiado de resolucao dentro do produto, reduzindo friccao operacional.

## Stories

1. **43.1 — Backend denial remediation recommendations endpoint** (`@data-engineer`)  
Status: `Done`

2. **43.2 — SDR dashboard guided remediation UX** (`@dev`)  
Status: `Done`

3. **43.3 — QA Gate + PO Go/No-Go (denial remediation)** (`@qa + @po`)  
Status: `Done`

## Execution Order

`43.1 -> 43.2 -> 43.3`

## Definition of Done

- [x] Backend expoe recomendacoes de remediacao por motivo de negacao
- [x] Dashboard exibe "Como resolver" com acoes claras quando permissao for negada
- [x] Evento de remediacao iniciada registrado para auditoria leve
- [x] Testes backend e regressao dashboard verdes
- [x] Gate final QA/PO com decisao GO documentada
