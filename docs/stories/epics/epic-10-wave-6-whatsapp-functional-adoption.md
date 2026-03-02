# Epic 10 — Wave 6 WhatsApp Functional Adoption (UI + Campaign Flow)

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Done
**Prioridade:** P1 (Adoção Funcional)
**Wave:** 6
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Transformar a base de integração de mensageria (Wave 5) em fluxo funcional de uso no produto, conectando UI de WhatsApp e ações de lead ao backend de envio incremental com segurança operacional.

## Scope (priorizado)

1. Adoção funcional na UI WhatsApp
- Conectar a tela WhatsApp ao backend real (`/api/integrations/messaging/send`) em modo controlado.
- Exibir status de provider ativo/fallback e feedback de envio.

2. Fluxo de envio a partir de Leads
- Integrar ações `Contactar/Enviar mensagem` ao endpoint de mensageria.
- Garantir fallback de UX quando provider real não estiver configurado.

3. Observabilidade operacional de envio
- Registrar e exibir histórico básico de envios (dry-run/live, provider, status).
- Definir critérios de validação QA para fluxo end-to-end de envio funcional.

## Prioritized Backlog (PM)

1. **Story 10.1 — WhatsApp UI Integration (P1)**
- Objetivo: tela WhatsApp consumindo endpoint real com feedback operacional.
- Gate primário: `@qa`.

2. **Story 10.2 — Leads Messaging Action Integration (P1)**
- Objetivo: ações de lead acionando fluxo de envio com fallback seguro.
- Gate primário: `@architect` + `@qa`.

3. **Story 10.3 — Messaging Activity Visibility (P1)**
- Objetivo: visibilidade operacional mínima de envios na UI.
- Gate primário: `@qa`.

## Execution Order (PM)

1. Story 10.1 -> habilita consumo funcional da API na tela dedicada
2. Story 10.2 -> integra fluxo de envio no ponto de operação (Leads)
3. Story 10.3 -> consolida observabilidade e validação funcional

## Compatibility Requirements

- Preservar semântica dos endpoints existentes (Waves 1-5).
- Manter `dry_run` como opção de segurança operacional na UI.
- Não bloquear uso da plataforma quando provider externo não estiver configurado.

## Risks and Mitigation

1. Falha por credenciais ausentes
- Mitigação: fallback explícito de UX + mensagens acionáveis no frontend.

2. Regressão em fluxo de Leads
- Mitigação: integração incremental por ação + smoke de regressão em lote.

3. Divergência entre modo dry-run e live
- Mitigação: indicadores visuais claros de modo de execução e provider.

## Definition of Done

- [x] Stories 10.1, 10.2 e 10.3 implementadas e aprovadas
- [x] Fluxo funcional de envio disponível na UI WhatsApp e Leads
- [x] Observabilidade mínima de envio disponível para operação
- [x] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` e o fluxo de envio funcional estiver validado sem bloqueios críticos.
