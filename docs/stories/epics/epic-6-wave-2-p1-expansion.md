# Epic 6 — Wave 2 P1 Expansion: Dashboard Analytics, Scraper Automação, Leads UX

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md
**Status:** Done
**Prioridade:** P1 (Should Have)
**Wave:** 2
**Estimativa:** 2-3 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Entregar os itens P1 da Wave 2 para elevar a operação de SDR com analytics contínuo no Dashboard, automação no Scraper e UX avançada em Leads.

## Scope (PRD P1)

1. Dashboard Analytics
- RF-D4: Performance semanal (métricas + gráfico 7 dias)
- RF-D5: Atividade unificada (timeline de eventos)

2. Scraper Automação
- RF-S4: Agendamento de coletas
- RF-S6: Opções avançadas no formulário

3. Leads UX
- RF-L5: Cards enriquecidos
- RF-L6: Sidebar de insights inteligentes
- RF-L7: Modal redesenhado com tabs

## Execution Order (PM)

1. Story 6.1 -> primeiro (reduz risco operacional com observabilidade)
2. Story 6.2 -> segundo (automatiza aquisição com controles)
3. Story 6.3 -> terceiro (expansão UX com maior impacto visual/comportamental)

## Milestones

### Milestone 1 (Semana 1) — Analytics Base
- Story 6.1 em `Done`
- Endpoints novos do dashboard em produção local
- Dashboard com gráfico 7 dias + timeline unificada funcionando
- Gate: @architect + @qa aprovados

### Milestone 2 (Semana 2) — Automação Scraper
- Story 6.2 em `Done`
- CRUD de agendamento e toggle avançado entregues
- Limite de 5 agendamentos ativos validado
- Gate: @architect + @qa aprovados

### Milestone 3 (Semana 3) — UX Leads
- Story 6.3 em `Done`
- Cards enriquecidos + sidebar insights + modal tabs entregues
- Regressão P0 validada
- Gate: @qa + @po aprovados

## Story Plan

1. Story 6.1 — Dashboard Analytics (RF-D4, RF-D5)
- Executor: `@dev`
- Gate primário: `@architect`

2. Story 6.2 — Scraper Automação (RF-S4, RF-S6)
- Executor: `@dev`
- Gate primário: `@architect`

3. Story 6.3 — Leads UX (RF-L5, RF-L6, RF-L7)
- Executor: `@dev`
- Gate primário: `@qa`

## Compatibility Requirements

- Preservar fluxos P0 já validados na Wave 1
- Mudanças de API devem manter contratos existentes
- Evitar regressão de performance nas telas principais
- Não remover endpoints existentes sem alias de compatibilidade

## Risks and Mitigation

1. Alto acoplamento UI/API na Story 6.1
- Mitigação: congelar contrato dos endpoints antes da UI final.

2. Dependência de scheduler na Story 6.2
- Mitigação: iniciar com execução simples e logs explícitos; evoluir worker em etapa posterior.

3. Regressão visual/fluxo na Story 6.3
- Mitigação: rollout incremental por seção e smoke visual em cada merge.

## Definition of Done

- [x] Stories 6.1, 6.2 e 6.3 implementadas e aprovadas
- [x] RF P1 da Wave 2 atendidos
- [x] QA/Arquitetura/PO aprovados
- [x] `npm run lint`, `npm run typecheck`, `npm test` verdes

## Exit Criteria

- Epic pode ser fechado quando os 3 milestones estiverem completos e sem bloqueios críticos abertos.
