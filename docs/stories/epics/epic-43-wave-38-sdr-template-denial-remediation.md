# Epic 43 — Wave 38 SDR Template Denial Remediation

**Brief:** `docs/brief-epic-43-sdr-template-denial-remediation.md`  
**Status:** Draft  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Transformar bloqueios de permissao de templates SDR em fluxo guiado de resolucao dentro do produto, reduzindo friccao operacional.

## Stories

1. **43.1 — Backend denial remediation recommendations endpoint** (`@data-engineer`)  
Status: `Draft`

2. **43.2 — SDR dashboard guided remediation UX** (`@dev`)  
Status: `Draft`

3. **43.3 — QA Gate + PO Go/No-Go (denial remediation)** (`@qa + @po`)  
Status: `Draft`

## Execution Order

`43.1 -> 43.2 -> 43.3`

## Definition of Done

- [ ] Backend expoe recomendacoes de remediacao por motivo de negacao
- [ ] Dashboard exibe "Como resolver" com acoes claras quando permissao for negada
- [ ] Evento de remediacao iniciada registrado para auditoria leve
- [ ] Testes backend e regressao dashboard verdes
- [ ] Gate final QA/PO com decisao GO documentada
