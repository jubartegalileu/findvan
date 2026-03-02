# Project Brief: Epic 32 — SDR Bulk Notes

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisão Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Com atribuição, marcação e agendamento em lote já operacionais, faltava permitir registro de nota em lote para manter histórico operacional consistente sem abrir card por card.

## Goal

Adicionar nota em lote no SDR com baixo risco:
1. endpoint dedicado para batch notes;
2. UI com campo de nota em lote;
3. gate QA/PO com regressão verde.

## Scope

- `PATCH /api/sdr/notes/batch`
- serviço backend para anexar nota em múltiplos leads
- ação UI `Adicionar nota em lote`
- cobertura de testes backend e dashboard
