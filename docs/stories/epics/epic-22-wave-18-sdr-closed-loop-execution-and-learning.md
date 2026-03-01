# Epic 22 — Wave 18 SDR Closed-Loop Execution and Learning

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (continuidade pós-Wave 17)
**Status:** Ready
**Prioridade:** P1 (Operação SDR)
**Wave:** 18
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Fechar o ciclo operacional SDR com feedback contínuo de execução, resultado e aprendizado para melhorar priorização diária sem aumentar fricção.

## Scope (priorizado)

1. Loop de execução
- Registrar resultado das ações prioritárias no mesmo fluxo da operação.
- Tornar visível o que foi executado no turno e o impacto imediato.

2. Aprendizado operacional
- Identificar padrões de ações com melhor/menor resultado por estágio.
- Expor recomendações de ajuste de playbook orientadas por evidência.

3. Governança de melhoria contínua
- Consolidar sinais de eficiência por turno para revisão rápida.
- Manter compatibilidade total com fluxos existentes.

## Prioritized Backlog (PM)

1. **Story 22.1 — Execution Outcome Capture (P1)**
- Objetivo: capturar e exibir resultado das ações executadas no workspace.
- Gate primário: `@architect` + `@qa`.

2. **Story 22.2 — Stage Learning Signals (P1)**
- Objetivo: produzir sinais de aprendizado por estágio baseados em execução real.
- Gate primário: `@architect` + `@qa`.

3. **Story 22.3 — Continuous Improvement Brief (P1)**
- Objetivo: gerar resumo acionável de melhoria contínua para o próximo turno.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 22.1 -> captura de resultado operacional
2. Story 22.2 -> sinais de aprendizado por estágio
3. Story 22.3 -> resumo de melhoria contínua

## Compatibility Requirements

- Preservar contratos atuais de Leads/Dashboard/Integrations.
- Entregas aditivas sem remoção de campos ou fluxos existentes.
- Fallback seguro quando dados de resultado não estiverem disponíveis.

## Risks and Mitigation

1. Sobrecarga de registro operacional
- Mitigação: captura simplificada com opções curtas e acionáveis.

2. Sinais de aprendizado sem confiança
- Mitigação: explicitar volume de amostra e janela analisada.

3. Ruído no resumo de melhoria
- Mitigação: limitar a recomendações com maior impacto potencial.

## Definition of Done

- [ ] Stories 22.1, 22.2 e 22.3 implementadas e aprovadas
- [ ] Captura de resultado operacional funcional
- [ ] Sinais de aprendizado por estágio visíveis
- [ ] Brief de melhoria contínua acionável
- [ ] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` sem bloqueio crítico de usabilidade na rotina de execução e revisão.
