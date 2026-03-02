# Project Brief: Epic 30 — SDR Bulk Done Execution

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisão Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Depois da atribuição em lote (Epic 29), faltava fechar um passo operacional recorrente: marcar múltiplos leads como executados no dia em uma única ação.

## Problem

- Operador ainda precisava marcar "feito" lead-a-lead.
- Em turnos de alto volume, isso aumenta fricção e tempo de operação.

## Goal

Adicionar execução em lote de ação SDR (`done`) com baixo risco:
1. Endpoint batch para ação operacional.
2. Integração direta na aba SDR para leads selecionados.
3. Cobertura de testes e gate de regressão preservados.

## Scope

- `PATCH /api/sdr/action/batch`
- serviço backend para update em lote de ação SDR
- botão `Marcar lote como feito` na aba SDR
- testes de API/service + UI + regressão SDR/Funil

## Out of Scope

- Regras de alçada/permissão por usuário
- Ações em lote customizadas por playbook
- SLA automático pós-ação

## Success Criteria

- Operador conclui lote de leads com uma ação.
- Atualização de fila/métricas ocorre sem regressão.
- Gates de lint/typecheck/test regressão permanecem verdes.
