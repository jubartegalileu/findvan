# Epic 13 — Wave 9 Scale, Observability & Cost Control

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Ready
**Prioridade:** P1 (Escala Operacional)
**Wave:** 9
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Consolidar a operação de mensageria e campanhas em escala, com observabilidade acionável, limites operacionais e controle de custo/volume para manter previsibilidade do funil SDR.

## Scope (priorizado)

1. Observabilidade operacional avançada
- Expandir métricas operacionais de campanha/receipts com visão de taxa de sucesso, latência e falhas por janela temporal.
- Expor indicadores de risco com thresholds claros para ação rápida do operador.

2. Escala e performance do monitoramento
- Garantir consultas eficientes para painéis de atividade, reconciliação e campanhas com maior volume de eventos.
- Definir e aplicar paginação/limites operacionais para evitar degradação em UI e API.

3. Controle de custo e retenção de dados
- Definir política de retenção para receipts e eventos de atividade.
- Incluir visibilidade de consumo operacional (volume processado e estimativa de custo relativo) sem quebrar fluxo atual.

## Prioritized Backlog (PM)

1. **Story 13.1 — Operational SLO Dashboard (P1)**
- Objetivo: criar visão consolidada de SLO operacional (entrega, resposta, falhas, latência) com alertas por threshold.
- Gate primário: `@qa`.

2. **Story 13.2 — Receipts Retention & Query Limits (P1)**
- Objetivo: implementar retenção/limpeza de dados e limites de consulta para estabilidade.
- Gate primário: `@architect` + `@qa`.

3. **Story 13.3 — Cost & Throughput Insights (P1)**
- Objetivo: exibir consumo de volume/processamento por período para orientar cadência e custo.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 13.2 -> fundação de estabilidade (retenção + limites)
2. Story 13.1 -> observabilidade operacional com SLO
3. Story 13.3 -> insights de custo/throughput para decisão de operação

## Compatibility Requirements

- Preservar semântica dos endpoints existentes (Waves 1-8).
- Não introduzir breaking changes em payloads de campaigns/receipts/activity.
- Manter fallback operacional quando dados de custo não estiverem disponíveis.

## Risks and Mitigation

1. Crescimento de dados degradando leitura operacional
- Mitigação: política de retenção explícita, índices mínimos e paginação obrigatória.

2. Alertas excessivos (ruído operacional)
- Mitigação: thresholds configuráveis e priorização por severidade.

3. Interpretação incorreta de custo/volume
- Mitigação: labels claros, períodos padronizados e documentação curta de leitura.

## Definition of Done

- [ ] Stories 13.1, 13.2 e 13.3 implementadas e aprovadas
- [ ] Observabilidade operacional com SLO e alertas por threshold
- [ ] Retenção/limites aplicados sem regressão de contrato
- [ ] Insights de custo e throughput disponíveis para operação
- [ ] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechada quando as 3 stories estiverem `Done` e não houver bloqueio crítico de escala/performance no monitoramento operacional.
