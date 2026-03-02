# Epic 26 — Wave 21 Test Signal & Release Orchestration

**PRD:** Continuidade pós Epic 25 (hardening + readiness)
**Status:** Done
**Prioridade:** P0 (Confiabilidade de gate)
**Wave:** 21
**Estimativa:** 1 sprint curta (3 stories)
**Owner:** @pm (Morgan)

---

## Epic Goal

Eliminar ruídos residuais de validação e padronizar um gate único/reproduzível para SDR/Funil, com decisão final de release rastreável.

## Scope (priorizado)

1. Sinal limpo de testes no dashboard
- Remover ruídos de execução (`act(...)` já tratado na wave anterior e warning de runtime de ambiente no gate).
- Garantir comandos estáveis para regressão dirigida.

2. Orquestração de quality gate
- Consolidar comandos de validação para backend + dashboard.
- Deixar execução simples para @qa e rastreável para @po.

3. Fechamento formal de release
- Registrar evidências e emitir decisão GO/HOLD com critérios objetivos.

## Prioritized Backlog (PM)

1. **Story 26.1 — Dashboard Test Runtime Signal Cleanup (P0)**
- Objetivo: estabilizar execução de testes do dashboard sem ruído evitável.
- Gate primário: `@architect` + `@qa`.

2. **Story 26.2 — Unified QA Gate Commands for SDR/Funil (P0)**
- Objetivo: padronizar execução de regressão por scripts dedicados.
- Gate primário: `@qa`.

3. **Story 26.3 — Release Decision Dossier (P0)**
- Objetivo: consolidar evidências e formalizar GO/HOLD final.
- Gate primário: `@qa` + `@po`.

## Execution Order (PM)

1. Story 26.1 -> limpeza de sinal do dashboard
2. Story 26.2 -> scripts unificados de regressão
3. Story 26.3 -> decisão formal de release

## Definition of Done

- [x] Stories 26.1, 26.2 e 26.3 em `Done`
- [x] Gate SDR/Funil executável com comandos padronizados
- [x] Evidências de execução anexadas em relatório de release
- [x] Recomendação final GO/HOLD documentada
