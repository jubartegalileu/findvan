# Epic 16 — Wave 12 Operational Excellence & Self-Healing

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade operacional)
**Status:** Ready
**Prioridade:** P1 (Excelência Operacional)
**Wave:** 12
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Elevar a operação para padrão de auto-recuperação, com remediação automática de falhas recorrentes, observabilidade orientada a SLO e playbooks executáveis para reduzir MTTR e risco operacional.

## Scope (priorizado)

1. Self-healing de jobs e integrações
- Automatizar ações de recuperação para falhas recorrentes de retenção/alerting.
- Definir política de retry/backoff e circuit-breaker operacional para integrações críticas.

2. Observabilidade orientada a SLO
- Consolidar visão de saúde operacional com indicadores acionáveis de degradação.
- Padronizar sinais de incidentes para diagnóstico rápido (causa, impacto, escopo, owner).

3. Governança de resposta a incidentes
- Formalizar playbooks operacionais com critérios de acionamento.
- Garantir rastreabilidade de execução de remediações e decisões operacionais.

## Prioritized Backlog (PM)

1. **Story 16.1 — Automated Recovery Policies for Retention/Alerting (P1)**
- Objetivo: implementar políticas de auto-recuperação para incidentes recorrentes sem intervenção manual inicial.
- Gate primário: `@architect` + `@qa`.

2. **Story 16.2 — SLO Degradation Guardrails & Incident Classification (P1)**
- Objetivo: classificar degradações por severidade/impacto e expor guardrails acionáveis em API/UI.
- Gate primário: `@architect` + `@qa`.

3. **Story 16.3 — Operational Playbooks & Postmortem Readiness (P1)**
- Objetivo: conectar telemetria a playbooks operacionais e checklist de pós-incidente auditável.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 16.1 -> fundação de auto-recuperação
2. Story 16.2 -> classificação de degradação e guardrails
3. Story 16.3 -> playbooks e prontidão de pós-incidente

## Compatibility Requirements

- Preservar semântica dos endpoints existentes (Waves 1-11).
- Não remover campos atualmente consumidos pelo dashboard.
- Entregas aditivas com fallback seguro em caso de indisponibilidade parcial.

## Risks and Mitigation

1. Remediação automática agressiva gerar efeitos colaterais
- Mitigação: limites de execução, cooldown e trilha de auditoria obrigatória.

2. Ruído operacional por excesso de sinalização
- Mitigação: classificação consistente de severidade, deduplicação e priorização.

3. Complexidade de operação aumentar em vez de reduzir
- Mitigação: playbooks simples, objetivos e acionáveis via evidências de telemetria.

## Definition of Done

- [ ] Stories 16.1, 16.2 e 16.3 implementadas e aprovadas
- [ ] Políticas de self-healing ativas para cenários críticos definidos
- [ ] Guardrails de degradação SLO disponíveis em backend e visíveis no dashboard
- [ ] Playbooks operacionais e evidências de execução persistidas
- [ ] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` e não houver bloqueio crítico de resposta operacional em cenário de degradação.
