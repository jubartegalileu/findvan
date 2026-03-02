# Epic 7 — Wave 3 P2 Polish: Dashboard Quick Actions, Scraper Coverage, Leads Tags

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md
**Status:** Done
**Prioridade:** P2 (Could Have)
**Wave:** 3
**Estimativa:** 1 semana
**Owner:** @pm (Morgan)

---

## Epic Goal

Entregar os itens P2 da Wave 3 para aumentar produtividade operacional e refinamento de UX sem regressão dos fluxos P0/P1.

## Scope (PRD P2)

1. Dashboard
- RF-D6: Ações rápidas nos leads recentes (`Contactar`, `Ver`)

2. Scraper
- RF-S5: Mapa de cobertura (estados/cidades, média e sugestão de próxima cidade)

3. Leads
- RF-L8: Tags customizáveis (cadastro, autocomplete, filtro e uso em lote)

## Execution Order (PM)

1. Story 7.1 -> Dashboard Quick Actions (baixo risco e entrega rápida)
2. Story 7.2 -> Scraper Coverage Map (visibilidade operacional)
3. Story 7.3 -> Leads Tags (impacto direto no workflow SDR)

## Story Plan

1. Story 7.1 — Dashboard Quick Actions (RF-D6)
- Executor: `@dev`
- Gate primário: `@qa`

2. Story 7.2 — Scraper Coverage Map (RF-S5)
- Executor: `@dev`
- Gate primário: `@architect`

3. Story 7.3 — Leads Tags (RF-L8)
- Executor: `@dev`
- Gate primário: `@qa`

## Compatibility Requirements

- Preservar comportamento validado da Wave 1 e Wave 2.
- Não alterar contratos existentes sem manter compatibilidade.
- Não reintroduzir poluição de timeline/runs por ações administrativas.

## Definition of Done

- [x] Stories 7.1, 7.2 e 7.3 implementadas e aprovadas
- [x] RF P2 da Wave 3 atendidos
- [x] QA/Arquitetura/PO aprovados
- [x] `npm run lint`, `npm run typecheck`, `npm test` verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` e sem bloqueios críticos.
