# Epic 39 — Wave 34 SDR Template Team Permissions

**Brief:** `docs/brief-epic-39-sdr-template-team-permissions.md`  
**Status:** Draft  
**Prioridade:** P0  
**Estimativa:** 1 sprint curta (3 stories)  
**Owner:** @pm (Morgan)

---

## Epic Goal

Aplicar permissao por equipe nas mutacoes de templates SDR para reduzir alteracao indevida entre scopes.

## Stories

1. **39.1 — Backend team permission policy for template mutations** (`@data-engineer`)  
Status: `Draft`

2. **39.2 — Dashboard handling for permission-denied template operations** (`@dev`)  
Status: `Draft`

3. **39.3 — QA Gate + PO Go/No-Go (team permissions)** (`@qa + @po`)  
Status: `Draft`

## Execution Order

`39.1 -> 39.2 -> 39.3`

## Definition of Done

- [ ] Backend bloqueia mutacao fora do escopo permitido
- [ ] Dashboard exibe feedback claro para acesso negado
- [ ] Testes backend e regressao dashboard verdes
- [ ] Gate final QA/PO com decisao GO documentada
