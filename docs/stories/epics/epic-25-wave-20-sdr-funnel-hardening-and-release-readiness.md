# Epic 25 — Wave 20 SDR/Funil Hardening & Release Readiness

**PRD:** Continuidade pós Epic 24 (SDR/Funil workflow linear)
**Status:** Draft
**Prioridade:** P0 (Estabilização de produção)
**Wave:** 20
**Estimativa:** 1 sprint (3 stories)
**Owner:** @pm (Morgan)

---

## Epic Goal

Consolidar a entrega do Epic 24 com foco em robustez operacional, performance em escala e validação de regressão para liberar operação diária com menor risco.

## Scope (priorizado)

1. Hardening backend SDR/Pipeline
- Reduzir risco de inconsistência/performance em cenários de volume (imports e movimentações em lote).
- Padronizar observabilidade mínima de erros/latência dos endpoints novos.

2. Performance e UX de fluxo diário
- Garantir boa experiência em filas e kanban com volume maior de leads.
- Consolidar estados de loading/erro/vazio nas abas Dashboard, SDR, Funil e Leads.

3. Gate de qualidade e readiness
- Eliminar dívida de testes de interação (`act(...)`) e estabilizar suíte de regressão.
- Formalizar checklist de release e rollback para o módulo SDR/Funil.

## Prioritized Backlog (PM)

1. **Story 25.1 — Backend Hardening for SDR/Pipeline (P0)**
- Objetivo: robustez de dados e previsibilidade de performance em volume.
- Gate primário: `@architect` + `@qa`.

2. **Story 25.2 — Frontend Performance & UX Consistency (P0)**
- Objetivo: fluidez de uso em SDR/Funil/Leads/Dashboard com payloads maiores.
- Gate primário: `@architect` + `@qa`.

3. **Story 25.3 — QA Stabilization & Release Checklist (P0)**
- Objetivo: fechamento de qualidade com critérios claros de go/no-go.
- Gate primário: `@qa` + `@po`.

## Execution Order (PM)

1. Story 25.1 -> hardening backend
2. Story 25.2 -> ajustes de performance/UX no frontend
3. Story 25.3 -> validação final e readiness de release

## Compatibility Requirements

- Preservar contratos já publicados em `/api/leads`, `/api/sdr/*`, `/api/pipeline/*`.
- Não reintroduzir lógica de funil/cadência na aba Leads.
- Não alterar comportamento funcional de Scraper, WhatsApp, Campanhas, Configurações.

## Risks and Mitigation

1. Regressão ao otimizar consultas/índices
- Mitigação: testes de integração focados em SDR/Pipeline + comparação de payload.

2. Queda de usabilidade com mudanças de performance
- Mitigação: manter contratos visuais atuais e validar com smoke de navegação.

3. Falso positivo de estabilidade por testes frágeis
- Mitigação: remover warnings de `act(...)`, reduzir flakiness e documentar gate de release.

## Definition of Done

- [ ] Stories 25.1, 25.2 e 25.3 em `Done`
- [ ] Suíte de regressão SDR/Funil/Leads/Dashboard estável e verde
- [ ] Checklists de release e rollback documentados no story final
- [ ] Sem regressão funcional das abas já existentes

## Exit Criteria

- Epic pode ser fechado quando o módulo SDR/Funil estiver operacionalmente estável, com QA gate formal e pronto para evolução de features.

