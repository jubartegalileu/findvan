# Epic 11 — Wave 7 Campaign Cadence Operations (Execution + Monitoring)

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Done
**Prioridade:** P1 (Operação de Campanhas)
**Wave:** 7
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Evoluir a adoção funcional de mensageria (Wave 6) para operação de campanhas com cadência, adicionando monitoramento de entrega/resposta e critérios de qualidade claros para uso diário do SDR.

## Scope (priorizado)

1. Execução de campanha por lote
- Conectar fluxo de seleção de leads para campanha ao backend existente de batch campaign (`/api/leads/batch/campaign`).
- Padronizar feedback de execução (itens processados, sucessos, falhas).

2. Monitoramento operacional de campanha
- Exibir resumo de execução por campanha (enviadas, entregues, respostas, falhas) com atualização periódica.
- Melhorar leitura operacional em telas WhatsApp/Campanhas sem quebrar fluxos atuais.

3. Contrato de receipts/webhooks (entrega e resposta)
- Definir contrato incremental para eventos assíncronos de entrega/resposta.
- Garantir compatibilidade backward com payloads atuais e fallback quando provider externo não retornar callbacks.

## Prioritized Backlog (PM)

1. **Story 11.1 — Campaign Batch Execution UI (P1)**
- Objetivo: operacionalizar adição em lote e disparo controlado de campanha via UI.
- Gate primário: `@qa`.

2. **Story 11.2 — Messaging Receipts/Webhooks Contract (P1)**
- Objetivo: contrato incremental para status assíncrono sem breaking change.
- Gate primário: `@architect` + `@qa`.

3. **Story 11.3 — Campaign Monitoring Dashboard (P1)**
- Objetivo: visibilidade de execução e resposta com foco operacional.
- Gate primário: `@qa`.

## Execution Order (PM)

1. Story 11.2 -> trava de contrato/compatibilidade para eventos assíncronos
2. Story 11.1 -> execução funcional de campanha em lote
3. Story 11.3 -> consolidação de monitoramento e usabilidade operacional

## Compatibility Requirements

- Preservar semântica dos endpoints existentes (Waves 1-6).
- Manter opção `dry_run` e fallback seguro quando provider externo não estiver configurado.
- Não bloquear operação de Leads/WhatsApp na ausência de receipts em tempo real.

## Risks and Mitigation

1. Dependência de callbacks externos (instabilidade/atraso)
- Mitigação: polling defensivo + estado intermediário explícito na UI.

2. Divergência entre status local e status do provider
- Mitigação: regras de reconciliação com timestamp e prioridade de fonte.

3. Regressão no fluxo de lote
- Mitigação: smoke funcional em cenários mínimos + validação visual das telas principais.

## Definition of Done

- [x] Stories 11.1, 11.2 e 11.3 implementadas e aprovadas
- [x] Execução de campanha em lote funcional com feedback operacional
- [x] Monitoramento básico de campanha disponível para operação SDR
- [x] Contrato incremental de receipts/webhooks aprovado sem breaking change
- [x] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechada quando as 3 stories estiverem `Done` e não houver bloqueio crítico de operação/cadência em ambiente local.
