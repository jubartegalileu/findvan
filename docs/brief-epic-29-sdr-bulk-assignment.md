# Project Brief: Epic 29 — SDR Bulk Assignment

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisão Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Após os Epics 27 e 28 (fundação multi-vendedor + quick assign por card), o próximo passo operacional é reatribuir múltiplos leads em lote na aba SDR.

## Problem

- Reatribuição existia apenas lead-a-lead.
- Operação diária de redistribuição entre vendedores era lenta em cenários de volume.

## Goal

Entregar atribuição em lote no SDR com baixo risco:
1. Backend com endpoint batch consistente com o contrato atual.
2. Frontend SDR com seleção múltipla e ação única de atribuição.
3. Gate QA/PO com evidências e decisão GO/HOLD.

## Scope

- `PATCH /api/sdr/assign/batch`
- Serviço backend para update transacional por lista de leads
- UI SDR com seleção de leads e ação `Atribuir em lote`
- Testes focados backend + dashboard

## Out of Scope

- Balanceamento automático por carga
- Regras de permissão por role/perfil
- Distribuição inteligente por score/região

## Success Criteria

- Operador consegue selecionar múltiplos leads e reatribuir vendedor em uma ação.
- Fila/métricas SDR permanecem estáveis após atribuição em lote.
- Regressão SDR/Funil permanece verde.
