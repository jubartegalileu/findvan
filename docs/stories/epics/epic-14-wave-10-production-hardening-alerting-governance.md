# Epic 14 — Wave 10 Production Hardening, Alerting & Metrics Governance

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Closed
**Prioridade:** P1 (Hardening de Produção)
**Wave:** 10
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Elevar a plataforma para operação mais resiliente em produção, retirando tarefas pesadas do request path, adicionando alerting externo e formalizando governança de métricas/SLO para operação e decisão.

## Scope (priorizado)

1. Hardening de retenção/expurgo
- Mover expurgo de receipts/activity para execução assíncrona periódica.
- Reduzir risco de latência em endpoints operacionais.

2. Alerting operacional externo
- Publicar alertas críticos de SLO para canal externo (webhook/Slack-like).
- Padronizar payload de incidente para triagem rápida.

3. Governança de métricas e thresholds
- Centralizar configuração de thresholds de SLO/custo com versionamento simples.
- Expor trilha de auditoria de alterações de configuração operacional.

## Prioritized Backlog (PM)

1. **Story 14.1 — Async Retention Jobs (P1)**
- Objetivo: remover expurgo de dados do request path e executar limpeza por scheduler/job.
- Gate primário: `@architect` + `@qa`.

2. **Story 14.2 — External Operational Alerting (P1)**
- Objetivo: emitir alertas críticos de SLO para endpoint externo com contrato estável.
- Gate primário: `@architect` + `@qa`.

3. **Story 14.3 — Metrics Governance & Audit Trail (P1)**
- Objetivo: tornar thresholds configuráveis com histórico de mudanças para operação.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 14.1 -> fundação de hardening (expurgo assíncrono)
2. Story 14.2 -> observabilidade acionável externa (alerting)
3. Story 14.3 -> governança e auditabilidade de métricas

## Compatibility Requirements

- Preservar semântica dos endpoints existentes (Waves 1-9).
- Não introduzir breaking change nos contratos já consumidos pelo dashboard.
- Manter fallback local quando integração externa de alerta estiver indisponível.

## Risks and Mitigation

1. Falha silenciosa de jobs assíncronos
- Mitigação: heartbeat/log de execução e último run visível para operação.

2. Ruído de alertas (alert fatigue)
- Mitigação: debounce/janela de supressão e níveis de severidade consistentes.

3. Configuração operacional inconsistente entre ambientes
- Mitigação: fonte única de configuração + trilha de auditoria por alteração.

## Definition of Done

- [x] Stories 14.1, 14.2 e 14.3 implementadas e aprovadas
- [x] Expurgo assíncrono ativo sem regressão de contrato
- [x] Alertas externos críticos disponíveis com fallback
- [x] Governança de thresholds com trilha de auditoria funcional
- [x] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechada quando as 3 stories estiverem `Done` e não houver bloqueio crítico de hardening/alerting para operação contínua.
