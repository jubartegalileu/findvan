# Epic 19 — Wave 15 SDR Funnel Operations Workspace

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade pós-Leads v2)
**Status:** Ready
**Prioridade:** P1 (Operação SDR)
**Wave:** 15
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Evoluir de operação de Leads consolidada para execução SDR orientada por funil, com workflow operacional claro de priorização, ação e acompanhamento.

## Scope (priorizado)

1. Workspace de execução SDR por funil
- Organizar visão operacional por estágio para reduzir fricção entre priorização e ação.
- Tornar explícitos próximos passos por lead (quem agir, quando agir, por quê).

2. Cadência operacional e follow-up
- Consolidar gestão de follow-up e agenda operacional no contexto do funil.
- Reduzir perda de oportunidade por atraso de ação em leads com resposta.

3. Governança de throughput SDR
- Expor sinais de produtividade operacional por estágio/owner.
- Criar base para decisões de capacidade e balanceamento de trabalho.

## Prioritized Backlog (PM)

1. **Story 19.1 — Funnel Workspace Baseline (P1)**
- Objetivo: estabelecer visão operacional por estágio com ações rápidas no contexto do funil.
- Gate primário: `@architect` + `@qa`.

2. **Story 19.2 — Follow-up & Cadence Control (P1)**
- Objetivo: consolidar controle de follow-up, vencimento e priorização de ação.
- Gate primário: `@architect` + `@qa`.

3. **Story 19.3 — SDR Throughput & Governance Signals (P1)**
- Objetivo: disponibilizar sinais operacionais de produtividade e gargalos por estágio.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 19.1 -> fundação visual/operacional do funil
2. Story 19.2 -> controle de cadência e follow-up
3. Story 19.3 -> governança de produtividade SDR

## Compatibility Requirements

- Preservar contratos já utilizados por Leads/Dashboard/WhatsApp.
- Entregas aditivas, sem remoção de campos consumidos pela UI existente.
- Garantir fallback seguro quando dados de cadência não estiverem completos.

## Risks and Mitigation

1. Complexidade visual do workspace reduzir usabilidade
- Mitigação: incremental por story, com foco em ações essenciais por etapa.

2. Ruído de alertas de follow-up
- Mitigação: priorização por criticidade/tempo de atraso e filtros claros.

3. Métricas de throughput sem contexto acionável
- Mitigação: acompanhar cada métrica com recomendação operacional explícita.

## Definition of Done

- [ ] Stories 19.1, 19.2 e 19.3 implementadas e aprovadas
- [ ] Workspace SDR por funil operacional e utilizável
- [ ] Controle de follow-up/cadência funcional para operação diária
- [ ] Sinais de throughput/governança SDR visíveis e acionáveis
- [ ] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` e não houver bloqueio crítico na operação SDR por funil.
