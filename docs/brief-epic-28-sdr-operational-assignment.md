# Project Brief: Epic 28 — SDR Operational Assignment

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisão Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Após o Epic 27 (fundação multi-vendedor com filtro por `assigned_to`), faltava a operação no dia a dia: reatribuir lead na própria aba SDR sem sair do fluxo.

## Problem

- O backend já aceita `assigned_to`, mas a UI SDR não permitia reatribuição rápida por card.
- Operador precisava depender de scripts/DB para remanejamento entre vendedores.

## Goal

Adicionar atribuição operacional no SDR com baixo risco:
1. Reatribuição por card via endpoint já publicado.
2. Feedback visual e recarga de fila/métricas após atribuição.
3. Gate QA completo sem regressão.

## Scope

- UI SDR: input + ação `Atribuir` por lead.
- Integração com `PATCH /api/sdr/{lead_id}/assign`.
- Testes frontend e regressão completa SDR/Funil.

## Out of Scope

- Bulk assignment
- Permissões por perfil
- Algoritmo automático de balanceamento

## Success Criteria

- Usuário consegue reatribuir vendedor sem sair da fila SDR.
- Regressão API/UI permanece verde.
