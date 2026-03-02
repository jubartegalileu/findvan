# Epic 23 — Wave 19 SDR Playbook Optimization and Experimentation

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade pós-Wave 18)
**Status:** Done
**Prioridade:** P1 (Operação SDR)
**Wave:** 19
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Evoluir o ciclo fechado da Wave 18 para um ciclo de otimização contínua, com experimentação controlada de abordagem SDR e governança de decisão baseada em evidência operacional.

## Scope (priorizado)

1. Otimização de playbook
- Transformar sinais por estágio em recomendações comparáveis por estratégia de execução.
- Manter leitura objetiva para decisão de turno sem aumentar complexidade operacional.

2. Experimentação operacional
- Permitir comparação simples entre abordagens (copy/janela/ritmo) no contexto do funil.
- Tornar visível qual abordagem gera melhor resultado por estágio e amostra.

3. Governança de decisão
- Consolidar critérios claros para promover/descartar ajustes de playbook.
- Preservar compatibilidade com fluxos atuais e fallback seguro.

## Prioritized Backlog (PM)

1. **Story 23.1 — Playbook Variant Tracking (P1)**
- Objetivo: rastrear variante operacional associada à execução de ação no turno.
- Gate primário: `@architect` + `@qa`.

2. **Story 23.2 — Comparative Efficiency by Variant (P1)**
- Objetivo: comparar eficiência por variante/estágio com leitura de amostra.
- Gate primário: `@architect` + `@qa`.

3. **Story 23.3 — Promotion/Rollback Recommendation Brief (P1)**
- Objetivo: gerar recomendação acionável de promover, manter em teste ou rollback de variante.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 23.1 -> rastreamento de variante operacional
2. Story 23.2 -> comparação de eficiência por variante
3. Story 23.3 -> recomendação de promoção/rollback

## Compatibility Requirements

- Preservar contratos atuais de Leads/Dashboard/Integrations.
- Entregas aditivas sem remoção de campos ou fluxos existentes.
- Fallback seguro quando não houver amostra suficiente.

## Risks and Mitigation

1. Ruído estatístico por baixa amostra
- Mitigação: explicitar tamanho de amostra e nível de confiança operacional.

2. Sobrecarga cognitiva no painel de Insights
- Mitigação: priorizar top sinais acionáveis e linguagem operacional curta.

3. Regressão de usabilidade no fluxo principal
- Mitigação: manter ações novas opcionais e alinhadas ao fluxo existente.

## Definition of Done

- [x] Stories 23.1, 23.2 e 23.3 implementadas e aprovadas
- [x] Rastreamento de variante operacional funcional
- [x] Comparativo por variante/estágio visível e acionável
- [x] Brief de recomendação de promoção/rollback funcional
- [x] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` sem bloqueio crítico de usabilidade na rotina diária de execução SDR.
