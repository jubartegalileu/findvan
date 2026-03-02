# Project Brief: Epic 27 — SDR Multi-Seller Foundation

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisão Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Com Epic 24-26 concluídos (workflow SDR/Funil, hardening e gate estável), o próximo passo já previsto no `brief-sdr-funil.md` (Phase 2) é habilitar a base de operação multi-vendedor.

## Problem

O campo `assigned_to` já existe em `sdr_activities`, mas não havia fluxo operacional completo:
- sem filtro por vendedor na fila/métricas SDR;
- sem endpoint explícito para reatribuição de dono do lead;
- sem integração de filtro de vendedor na aba SDR.

## Goal

Entregar fundação multi-vendedor com baixo risco, sem quebrar contratos existentes:
1. Backend: filtro por `assigned_to` em queue/stats + endpoint de atribuição.
2. Frontend: filtro “Vendedor” na aba SDR conectado ao backend.
3. QA: evidências de gate e recomendação GO/HOLD.

## Scope

- `GET /api/sdr/queue` com `assigned_to` opcional
- `GET /api/sdr/stats` com `assigned_to` opcional
- `PATCH /api/sdr/{lead_id}/assign`
- Aba SDR exibindo e filtrando por vendedor

## Out of Scope

- Auth/roles por vendedor
- SLA por vendedor
- Dashboard cross-seller avançado

## Success Criteria

- Operador consegue visualizar “só meus leads” na SDR.
- Reatribuição de lead via API disponível para evolução de UI.
- Gates de lint/typecheck/test permanecem verdes.
