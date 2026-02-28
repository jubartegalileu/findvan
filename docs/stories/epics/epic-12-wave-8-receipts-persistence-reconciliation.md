# Epic 12 — Wave 8 Receipts Persistence & Reconciliation

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Ready
**Prioridade:** P1 (Confiabilidade Operacional)
**Wave:** 8
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Evoluir o monitoramento de mensageria da Wave 7 para um modelo confiável em produção, com persistência durável de receipts, reconciliação de status e política de idempotência para webhooks.

## Scope (priorizado)

1. Persistência durável de receipts
- Substituir armazenamento volátil em memória por persistência em banco para eventos de receipts.
- Garantir leitura consistente para telas de monitoramento após reinício do backend.

2. Idempotência de webhooks
- Definir e aplicar deduplicação por `external_id` + provider/evento para evitar contagem duplicada.
- Registrar comportamento para reentregas de callback sem quebrar compatibilidade.

3. Reconciliação operacional de status
- Implementar rotina de reconciliação para alinhar status local e status de provider.
- Expor sinais de divergência para monitoramento e operação SDR.

## Prioritized Backlog (PM)

1. **Story 12.1 — Persistent Receipts Storage (P1)**
- Objetivo: persistir receipts em storage durável com leitura operacional.
- Gate primário: `@architect` + `@qa`.

2. **Story 12.2 — Webhook Idempotency Policy (P1)**
- Objetivo: evitar duplicidade de processamento em callbacks repetidos.
- Gate primário: `@architect`.

3. **Story 12.3 — Status Reconciliation Monitor (P1)**
- Objetivo: identificar e sinalizar divergências entre status local e provider.
- Gate primário: `@qa`.

## Execution Order (PM)

1. Story 12.2 -> trava de consistência/idempotência no ingresso de eventos
2. Story 12.1 -> persistência durável para suportar operação contínua
3. Story 12.3 -> reconciliação e visibilidade operacional de divergências

## Compatibility Requirements

- Preservar semântica dos endpoints existentes (Waves 1-7).
- Manter fallback operacional na ausência de callback em tempo real.
- Não introduzir breaking changes em payloads já aceitos de receipts/webhooks.

## Risks and Mitigation

1. Duplicidade de eventos por retries do provider
- Mitigação: chave idempotente por `external_id` com política explícita de atualização.

2. Inconsistência de status entre fontes
- Mitigação: reconciliação por timestamp/fonte e trilha de auditoria.

3. Carga adicional de leitura/escrita no backend
- Mitigação: índices mínimos e limites de consulta para telas operacionais.

## Definition of Done

- [ ] Stories 12.1, 12.2 e 12.3 implementadas e aprovadas
- [ ] Receipts persistidos em storage durável com leitura operacional
- [ ] Política de idempotência aplicada em webhooks sem breaking change
- [ ] Reconciliação de status disponível com visibilidade de divergências
- [ ] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechada quando as 3 stories estiverem `Done` e não houver bloqueio crítico de confiabilidade no fluxo de mensageria.
