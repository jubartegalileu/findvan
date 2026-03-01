# Epic 15 — Wave 11 Multi-Instance Readiness & Distributed Resilience

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Closed
**Prioridade:** P1 (Escalabilidade Distribuída)
**Wave:** 11
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Preparar a operação para múltiplas instâncias com estado distribuído de jobs/alerting, persistência durável de auditoria e execução dedicada de tarefas assíncronas fora do processo API.

## Scope (priorizado)

1. Execução distribuída de jobs
- Tirar ciclo de retenção do processo API e mover para worker/scheduler dedicado.
- Aplicar lock distribuído para evitar execução concorrente duplicada entre instâncias.

2. Estado operacional persistente
- Persistir status de retenção e alerting (run/fail/last_success) em storage compartilhado.
- Garantir leitura consistente de estado operacional em ambiente multi-instância.

3. Auditoria durável e observabilidade de failover
- Persistir audit trail de thresholds e eventos de fallback de alerting em banco.
- Expandir visibilidade de failover/erro com métricas de saúde operacional.

## Prioritized Backlog (PM)

1. **Story 15.1 — Dedicated Worker & Distributed Lock for Retention (P1)**
- Objetivo: executar retenção em worker separado com lock distribuído e heartbeat.
- Gate primário: `@architect` + `@qa`.

2. **Story 15.2 — Persistent Operational State Store (P1)**
- Objetivo: persistir estado de jobs/alerting e substituir estado volátil em memória.
- Gate primário: `@architect` + `@qa`.

3. **Story 15.3 — Durable Governance Audit & Failover Telemetry (P1)**
- Objetivo: persistir auditoria/fallbacks e ampliar telemetria operacional para análise pós-incidente.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 15.1 -> base de execução distribuída (worker + lock)
2. Story 15.2 -> estado operacional durável compartilhado
3. Story 15.3 -> auditoria persistente e telemetria de failover

## Compatibility Requirements

- Preservar semântica dos endpoints existentes (Waves 1-10).
- Não introduzir breaking changes em payloads consumidos pelo dashboard.
- Manter fallback seguro enquanto estado persistente migra do modo em memória.

## Risks and Mitigation

1. Corrida entre instâncias na execução de jobs
- Mitigação: lock distribuído com TTL e heartbeat de owner.

2. Regressão durante migração de estado volátil para persistente
- Mitigação: rollout gradual com fallback controlado e métricas de divergência.

3. Aumento de complexidade operacional
- Mitigação: contratos de status claros, playbook de incidentes e testes de failover.

## Definition of Done

- [x] Stories 15.1, 15.2 e 15.3 implementadas e aprovadas
- [x] Worker dedicado + lock distribuído em produção local/homolog
- [x] Estado operacional persistente para retenção/alerting disponível
- [x] Auditoria e telemetria de failover persistidas e consultáveis
- [x] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechada quando as 3 stories estiverem `Done` e não houver bloqueio crítico de operação multi-instância.
