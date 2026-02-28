# Epic 18 — Wave 14 Leads v2 Closure & Data Governance

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md (RF-L1..RF-L7 + consolidação Epic 4)
**Status:** Closed
**Prioridade:** P1 (Fechamento funcional de Leads)
**Wave:** 14
**Estimativa:** 1-2 semanas
**Owner:** @pm (Morgan)

---

## Epic Goal

Fechar pendências estruturantes de Leads v2 com foco em consistência de score/status, robustez operacional de filtros/lote e governança de dados para operar SDR sem gaps de processo.

## Scope (priorizado)

1. Consistência de dados de Leads
- Garantir cálculo/recálculo de score e coerência de status do funil para base existente.
- Eliminar divergências entre estado exibido em UI e persistência operacional.

2. Operação em escala no pipeline
- Reforçar filtros combinados e ações em lote para cenários de alto volume.
- Preservar performance e previsibilidade para operação diária do SDR.

3. Governança e UX operacional
- Consolidar histórico/notas/insights para tomada de decisão com rastreabilidade.
- Validar aderência final dos fluxos de Leads ao objetivo do PRD.

## Prioritized Backlog (PM)

1. **Story 18.1 — Score & Funnel Data Consistency (P1)**
- Objetivo: garantir score/status consistentes para base atual e eventos de edição/ingestão.
- Gate primário: `@architect` + `@qa`.

2. **Story 18.2 — Leads Filters/Batch Hardening at Scale (P1)**
- Objetivo: endurecer filtros combinados e operações em lote para uso operacional contínuo.
- Gate primário: `@architect` + `@qa`.

3. **Story 18.3 — Leads Insights/History Governance Finalization (P1)**
- Objetivo: consolidar visibilidade de histórico/insights e fechar aceite funcional de Leads v2.
- Gate primário: `@po` + `@qa`.

## Execution Order (PM)

1. Story 18.1 -> base consistente de score/status
2. Story 18.2 -> robustez operacional de filtros e lote
3. Story 18.3 -> fechamento de governança/insights com aceite final

## Compatibility Requirements

- Preservar contratos existentes de Leads, Dashboard e integrações já entregues.
- Evolução aditiva, sem remoção de campos consumidos pela UI.
- Manter fallback seguro em cenários de dados incompletos.

## Risks and Mitigation

1. Reprocessamento de score/status causar inconsistência temporária
- Mitigação: migração controlada, idempotente e com validação de pós-execução.

2. Regressão em operações em lote
- Mitigação: testes de regressão para fluxos críticos e limites operacionais explícitos.

3. Sobrecarga de UI em listas grandes
- Mitigação: paginação/filtros eficientes e validação de performance no gate QA.

## Definition of Done

- [x] Stories 18.1, 18.2 e 18.3 implementadas e aprovadas
- [x] Score/status de Leads consistentes para base histórica e novos eventos
- [x] Filtros e ações em lote estáveis em cenários operacionais
- [x] Governança de insights/histórico validada por PO
- [x] Quality gates (`lint`, `typecheck`, `test`) verdes

## Exit Criteria

- Epic pode ser fechado quando as 3 stories estiverem `Done` e não houver bloqueio crítico na operação de Leads.
