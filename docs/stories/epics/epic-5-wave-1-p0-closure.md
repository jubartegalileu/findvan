# Epic 5 — Wave 1 P0 Closure: Dashboard, Scraper e Leads

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md
**Status:** In QA
**Prioridade:** P0 (Must Have)
**Wave:** 1
**Estimativa:** 2-3 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Concluir a Wave 1 do PRD v2 fechando os gaps P0 restantes em Dashboard, Scraper e Leads, mantendo compatibilidade com o sistema atual e sem regressao operacional.

## Epic Description

**Existing System Context:**
- Current relevant functionality: backend FastAPI + PostgreSQL com APIs de leads/scraper; frontend React (dashboard) com telas operacionais ativas.
- Technology stack: FastAPI, PostgreSQL (psycopg), React/Vite, Puppeteer scraper.
- Integration points: `/api/leads`, `/api/scraper/*`, dashboard widgets, filtros e navegação entre Dashboard e Leads.

**Enhancement Details:**
- What's being added/changed: conclusão dos requisitos P0 pendentes (RF-D1..D3, RF-S1..S3, RF-L3..L4).
- How it integrates: evolução incremental de endpoints e componentes existentes, preservando contratos atuais com aliases de compatibilidade quando necessário.
- Success criteria: todos os RF P0 com evidência funcional e testes de regressão verdes.

---

## Stories (Enhanced with Quality Planning)

### Story 5.1 — Dashboard P0 Completion (RF-D1, RF-D2, RF-D3)

**Description:** Implementar KPIs expandidos, mini-funil visual clicável e widget de ações urgentes com redirecionamento para Leads filtrado.

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [api_contract_validation, backward_compatibility_review, ui_pattern_validation]
```

**Quality Gates:**
- Pre-Commit: validação de contratos de endpoint e fallback de loading/skeleton
- Pre-PR: revisão de compatibilidade entre Dashboard e Leads

**Focus:**
- Endpoints: `/api/dashboard/kpis`, `/api/dashboard/funnel-summary`, `/api/dashboard/urgent-actions`
- Interação: clique em barra/alerta aplica filtro na tela de Leads

---

### Story 5.2 — Scraper P0 Completion (RF-S1, RF-S2, RF-S3)

**Description:** Implementar keywords customizáveis por cidade, feedback inteligente de baixa captura e pipeline transparente de resultados (`encontrados > válidos > duplicados > novos`).

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [api_contract_validation, scraper_flow_review, error_handling_validation]
```

**Quality Gates:**
- Pre-Commit: validação de fluxo de coleta com e sem resultados
- Pre-PR: revisão de mensagens, regras de sugestão e consistência de métricas

**Focus:**
- Persistência de keywords por cidade/UF
- Banner de feedback com contador de 0-resultados consecutivos
- Barra segmentada com tooltip por etapa

---

### Story 5.3 — Leads P0 Completion (RF-L3, RF-L4 + testes P0)

**Description:** Finalizar filtros expandidos e ações em lote (status, campanha, exportar, excluir soft delete), incluindo cobertura de testes para os fluxos críticos da Wave 1.

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [regression_test_suite, batch_action_validation, ux_consistency_check]
```

**Quality Gates:**
- Pre-Commit: validação de lógica AND dos filtros e feedback de ações batch
- Pre-PR: suíte de regressão dos fluxos P0 (Leads + integrações com Dashboard/Scraper)

**Focus:**
- Filtros faltantes: fonte, data de captura, limpar filtros, persistência em sessão
- Ações em lote: seleção múltipla, contador, confirmações destrutivas, retorno de sucesso/erro
- Testes: unitários e integração para evitar regressão

---

## Compatibility Requirements

- [x] Existing APIs remain unchanged (ou cobertas por aliases de compatibilidade)
- [x] Database schema changes are backward compatible
- [ ] UI changes follow existing patterns e navegação atual
- [ ] Performance impact is minimal em Dashboard e Leads

## Risk Mitigation

- **Primary Risk:** divergência de contrato API entre frontend e backend durante fechamento simultâneo de múltiplos RF P0.
- **Mitigation:** congelar contrato por story, validar OpenAPI e manter aliases temporários.
- **Rollback Plan:** feature flags por widget/ação batch + rollback por deploy para versão estável anterior.

## Quality Assurance Strategy

- Code review orientado a compatibilidade e regressão.
- Testes de integração para endpoints novos/ajustados.
- Regressão de fluxo ponta a ponta: Scraper → Leads → Dashboard.
- Gates obrigatórios no final do epic: `npm run lint`, `npm run typecheck`, `npm test`.

## Definition of Done

- [ ] Stories 5.1, 5.2 e 5.3 concluídas com AC atendidos
- [ ] RF P0 pendentes da Wave 1 fechados
- [x] Sem regressão em fluxos existentes
- [x] Documentação de endpoints e comportamento de UI atualizada
- [x] Quality gates verdes (lint, typecheck, test)

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running FastAPI + PostgreSQL + React/Vite + Puppeteer
- Integration points: `/api/dashboard/*`, `/api/scraper/*`, `/api/leads/*`, filtros e navegação Dashboard↔Leads
- Existing patterns to follow: incremental enhancement over current pages/components and service layer
- Critical compatibility requirements: preserve existing endpoints or provide temporary aliases; avoid regressions in active flows
- Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering full Wave 1 P0 closure for Dashboard, Scraper and Leads." 

---

## Success Criteria

1. Scope da Wave 1 P0 concluída em até 3 stories coordenadas
2. Compatibilidade preservada durante toda a implementação
3. Risco de regressão controlado por testes e quality gates
4. Fluxo operacional completo visível no produto (captar, qualificar, operar)
5. Base pronta para iniciar Wave 2 (P1) sem retrabalho estrutural
