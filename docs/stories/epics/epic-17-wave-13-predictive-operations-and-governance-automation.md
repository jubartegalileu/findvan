# Epic 17 — Wave 13 Predictive Operations & Governance Automation

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Done
**Prioridade:** P1 (Operação Preditiva)
**Wave:** 13
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Evoluir de resposta reativa/assistida para operação preditiva, com detecção antecipada de degradação, automação de governança de thresholds e readiness contínua de execução de playbooks.

## Scope (priorizado)

1. Detecção preditiva de degradação
- Antecipar risco operacional com sinais de tendência (não apenas evento já crítico).
- Introduzir score de risco operacional por componente (retention/alerting/messaging).

2. Automação de governança operacional
- Sugerir ajuste de thresholds com base em histórico de incidentes/SLO.
- Registrar decisão (aceite/rejeição) para trilha de auditoria de governança.

3. Readiness contínua de incident response
- Validar periodicamente se playbooks e owners estão prontos para execução.
- Expor lacunas de readiness com priorização e recomendação.

## Prioritized Backlog (PM)

1. **Story 17.1 — Predictive Risk Scoring for Operational Telemetry (P1)**
- Objetivo: calcular score de risco antecipado por componente com severidade/probabilidade.
- Gate primário: `@architect` + `@qa`.

2. **Story 17.2 — Threshold Governance Suggestions & Decision Log (P1)**
- Objetivo: sugerir ajustes de thresholds e persistir decisão operacional auditável.
- Gate primário: `@architect` + `@qa`.

3. **Story 17.3 — Continuous Playbook Readiness Checks (P1)**
- Objetivo: monitorar prontidão de playbooks/owners e exibir lacunas acionáveis no dashboard.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 17.1 -> fundação preditiva de risco
2. Story 17.2 -> automação de governança e decisão
3. Story 17.3 -> readiness contínua de resposta

## Compatibility Requirements

- Preservar semântica dos endpoints existentes (Waves 1-12).
- Não remover campos consumidos atualmente pela UI.
- Novos dados devem ser aditivos e degradar com fallback seguro.

## Risks and Mitigation

1. Falso positivo em sinal preditivo
- Mitigação: calibrar modelo por janela e severidade, com feedback de decisão operacional.

2. Automação de threshold gerar instabilidade
- Mitigação: sugestões não destrutivas com aceite explícito e rollback rastreável.

3. Excesso de ruído de readiness
- Mitigação: priorização por criticidade e agrupamento por componente/owner.

## Definition of Done

- [x] Stories 17.1, 17.2 e 17.3 implementadas e aprovadas
- [x] Score de risco preditivo disponível e visível por componente
- [x] Sugestões de governança com trilha de decisão persistida
- [x] Readiness contínua de playbooks exibida com recomendações acionáveis
- [x] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` e não houver bloqueio crítico de operação preditiva/governança de incidentes.
