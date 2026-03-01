# Epic 20 — Wave 16 SDR SLA and Capacity Orchestration

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade pós-Wave 15)
**Status:** Ready
**Prioridade:** P1 (Operação SDR)
**Wave:** 16
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Transformar os sinais operacionais da Wave 15 em execução orientada por SLA, com priorização por risco e balanceamento de capacidade por estágio.

## Scope (priorizado)

1. SLA operacional por estágio
- Definir leitura de SLA por estágio (no prazo, atenção, violado) com base em próxima ação e atraso.
- Tornar a priorização diária objetiva para o operador SDR.

2. Orquestração de backlog e capacidade
- Expor visão de carga por estágio e criticidade para orientar sequência de execução.
- Reduzir acúmulo de follow-ups vencidos em estágios intermediários.

3. Governança acionável
- Recomendações operacionais com foco em redução de risco de perda por atraso.
- Base para futura distribuição automática por owner (sem quebrar contratos atuais).

## Prioritized Backlog (PM)

1. **Story 20.1 — SLA Baseline by Funnel Stage (P1)**
- Objetivo: disponibilizar baseline de SLA por estágio com semáforo operacional.
- Gate primário: `@architect` + `@qa`.

2. **Story 20.2 — Capacity Heatmap & Backlog Prioritization (P1)**
- Objetivo: tornar visível concentração de backlog e prioridade por criticidade.
- Gate primário: `@architect` + `@qa`.

3. **Story 20.3 — Operational Playbook Recommendations (P1)**
- Objetivo: orientar execução diária com recomendações prescritivas baseadas em sinais.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 20.1 -> baseline de SLA por estágio
2. Story 20.2 -> leitura de capacidade e priorização de backlog
3. Story 20.3 -> recomendações operacionais prescritivas

## Compatibility Requirements

- Preservar contratos atuais de Leads/Dashboard/Integrations.
- Entregas aditivas, sem remoção de campos existentes.
- Fallback seguro quando dados de próxima ação não estiverem completos.

## Risks and Mitigation

1. Excesso de alertas de SLA gerar ruído operacional
- Mitigação: priorização por severidade + limite de recomendações críticas simultâneas.

2. Interpretação ambígua de capacidade por estágio
- Mitigação: padronizar cálculo e explicitar fórmula no painel.

3. Ações recomendadas sem aderência operacional
- Mitigação: recomendações curtas, acionáveis e alinhadas ao fluxo atual de Leads.

## Definition of Done

- [ ] Stories 20.1, 20.2 e 20.3 implementadas e aprovadas
- [ ] SLA operacional por estágio visível e acionável
- [ ] Priorização de backlog por criticidade funcional
- [ ] Recomendações operacionais orientando execução diária
- [ ] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` e não houver bloqueio crítico na operação diária por SLA/capacidade.
