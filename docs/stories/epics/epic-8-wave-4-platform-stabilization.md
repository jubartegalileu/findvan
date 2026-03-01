# Epic 8 — Wave 4 Platform Stabilization & Integration Readiness

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Closed
**Prioridade:** P1 (Stability / Enablement)
**Wave:** 4
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Reduzir fricção operacional do time (dev/qa), estabilizar validação E2E local e preparar base técnica para integrações de próxima fase (WhatsApp/API e novas fontes OSINT).

## Scope (priorizado)

1. Plataforma e ambiente local
- Padronizar execução local de backend/frontend com perfil único de portas e variáveis.
- Eliminar conflitos de origem que geram ruído em smoke tests.

2. Confiabilidade de QA E2E
- Criar fluxo de smoke E2E canônico para Dashboard, Scraper e Leads.
- Definir evidências padrão e checklist de aprovação por story.

3. Readiness de integrações
- Definir contrato técnico mínimo para evolução de integrações WhatsApp/API.
- Preparar backlog técnico para novas fontes OSINT sem acoplamento prematuro.

## Prioritized Backlog (PM)

1. **Story 8.1 — Environment Hardening (P0 interno)**
- Objetivo: runtime local previsível.
- Gate primário: `@devops`.

2. **Story 8.2 — QA E2E Stabilization (P0 interno)**
- Objetivo: smoke reproduzível e sem falsos negativos.
- Gate primário: `@qa`.

3. **Story 8.3 — Integration Readiness Contracts (P1)**
- Objetivo: contratos e adapters-base para próxima wave funcional.
- Gate primário: `@architect`.

## Execution Order (PM)

1. Story 8.1 -> remove ruído estrutural
2. Story 8.2 -> consolida validação contínua
3. Story 8.3 -> destrava planejamento de integração

## Compatibility Requirements

- Preservar fluxos e contratos entregues nas Waves 1, 2 e 3.
- Não alterar semântica de endpoints existentes sem estratégia de compatibilidade.
- Evitar mudanças de UX que introduzam regressão funcional.

## Risks and Mitigation

1. Divergência de ambiente por máquina
- Mitigação: profile único versionado + comandos canônicos.

2. Falso negativo em smoke por dependências externas
- Mitigação: cenário isolado com dataset controlado e critérios explícitos.

3. Aumento de escopo para integrações antes da hora
- Mitigação: limitar Wave 4 a readiness/contrato, sem rollout completo.

## Definition of Done

- [x] Stories 8.1, 8.2 e 8.3 implementadas e aprovadas
- [x] Ambiente local padronizado e documentado
- [x] Smoke E2E estável com evidências consistentes
- [x] Contratos de readiness aprovados por arquitetura

## Exit Criteria

- Epic pode ser fechado quando os três itens priorizados estiverem `Done` e sem bloqueios críticos de estabilidade.
