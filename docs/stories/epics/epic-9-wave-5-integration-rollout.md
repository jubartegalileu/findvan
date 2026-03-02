# Epic 9 — Wave 5 Integration Rollout Incremental (WhatsApp/API + QA Visual)

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Done
**Prioridade:** P1 (Enablement Funcional)
**Wave:** 5
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Iniciar rollout funcional de integrações sobre a base estabilizada da Wave 4, mantendo compatibilidade dos fluxos existentes e reduzindo risco de regressão operacional.

## Scope (priorizado)

1. Integração de mensageria (base real)
- Conectar provider real de WhatsApp mantendo contrato `MessagingProvider`.
- Preservar modo fallback seguro (`noop`) para ambientes sem credenciais.

2. Evolução de contratos
- Definir estratégia de versionamento incremental de contrato (`v1 -> v1.1`) sem quebra.
- Publicar guidelines de backward compatibility para providers.

3. QA visual automatizado
- Adicionar etapa visual/screenshot no smoke canônico da Wave 4.
- Padronizar evidências visuais por rota principal.

## Prioritized Backlog (PM)

1. **Story 9.1 — WhatsApp Provider Incremental Rollout (P1)**
- Objetivo: provider real plugável com fallback.
- Gate primário: `@architect` + `@qa`.

2. **Story 9.2 — Contract Versioning v1.1 (P1)**
- Objetivo: evolução de contrato sem breaking change.
- Gate primário: `@architect`.

3. **Story 9.3 — QA Visual Smoke Automation (P1)**
- Objetivo: reduzir validação manual e ampliar evidência de regressão.
- Gate primário: `@qa`.

## Execution Order (PM)

1. Story 9.2 -> trava de compatibilidade antes do rollout
2. Story 9.1 -> implementação incremental do provider real
3. Story 9.3 -> hardening final de validação contínua

## Compatibility Requirements

- Preservar semântica dos endpoints existentes das Waves 1-4.
- Manter `noop` como fallback default quando provider externo não estiver configurado.
- Não introduzir dependência obrigatória de credenciais externas para ambiente local padrão.

## Risks and Mitigation

1. Dependência externa de provider (instabilidade)
- Mitigação: feature flag + fallback `noop` + timeout defensivo.

2. Breaking changes de contrato
- Mitigação: versionamento explícito (`v1.1`) e testes de compatibilidade retroativa.

3. Aumento de tempo de QA por visual checks
- Mitigação: baseline enxuta (Dashboard/Scraper/Leads) e execução em pipeline dedicado.

## Definition of Done

- [x] Stories 9.1, 9.2 e 9.3 implementadas e aprovadas
- [x] Rollout incremental de provider real concluído sem regressão crítica
- [x] Estratégia de versionamento de contratos aplicada
- [x] Smoke visual automatizado incorporado ao fluxo QA

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` e sem bloqueio crítico de compatibilidade/integridade.
