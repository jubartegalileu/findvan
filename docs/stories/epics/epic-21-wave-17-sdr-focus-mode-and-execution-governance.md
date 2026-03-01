# Epic 21 — Wave 17 SDR Focus Mode and Execution Governance

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade pós-Wave 16)
**Status:** Ready
**Prioridade:** P1 (Operação SDR)
**Wave:** 17
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Consolidar governança de execução diária no workspace SDR com foco em redução de ruído operacional e aumento de foco em itens críticos.

## Scope (priorizado)

1. Modo foco operacional
- Reduzir ruído visual e priorizar sinais críticos.
- Acelerar triagem de backlog com contexto mínimo necessário.

2. Governança de fila de execução
- Tornar fila prioritária mais previsível e rastreável para o operador.
- Facilitar execução sequencial sem perda de contexto.

3. Resumo diário acionável
- Transformar sinais em plano curto de execução diária.
- Apoiar handoff operacional com visão objetiva de risco.

## Prioritized Backlog (PM)

1. **Story 21.1 — Focus Mode for Critical Operations (P1)**
- Objetivo: ativar modo foco para destacar apenas risco alto/crítico no workspace.
- Gate primário: `@architect` + `@qa`.

2. **Story 21.2 — Execution Queue Governance (P1)**
- Objetivo: estruturar fila prioritária de execução com visibilidade operacional.
- Gate primário: `@architect` + `@qa`.

3. **Story 21.3 — Daily Operational Briefing (P1)**
- Objetivo: entregar briefing diário acionável a partir dos sinais da operação.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 21.1 -> modo foco e redução de ruído
2. Story 21.2 -> governança da fila prioritária
3. Story 21.3 -> briefing diário operacional

## Compatibility Requirements

- Preservar contratos atuais de Leads/Dashboard/Integrations.
- Mudanças aditivas e fallback seguro para dados incompletos.
- Não degradar fluxos existentes de funil/cadência/lote.

## Risks and Mitigation

1. Excesso de simplificação ocultar contexto relevante
- Mitigação: modo foco opcional e reversível em um clique.

2. Fila prioritária confundir critérios
- Mitigação: explicitar score operacional e regra de prioridade.

3. Briefing diário gerar redundância
- Mitigação: limitar a 3-5 recomendações objetivas por criticidade.

## Definition of Done

- [ ] Stories 21.1, 21.2 e 21.3 implementadas e aprovadas
- [ ] Modo foco operacional funcional
- [ ] Fila prioritária com governança operacional clara
- [ ] Briefing diário acionável disponível
- [ ] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` sem bloqueio crítico de usabilidade operacional.
