# Project Brief: Epic 35 — SDR Shared Template Persistence

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisao Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Epic 34 trouxe templates custom persistentes localmente por vendedor. O proximo passo e remover dependencia de maquina/navegador e persistir templates no backend.

## Goal

Persistir templates custom do SDR no backend para permitir uso compartilhado:
1. API de templates (`listar/salvar/excluir`);
2. integracao do painel SDR consumindo API;
3. regressao SDR/Funil e gate QA/PO verdes.

## Scope

- tabela `sdr_bulk_templates` no schema backend
- endpoints `/api/sdr/templates` (GET/POST/DELETE)
- migracao do frontend de `localStorage` para API
- testes backend e dashboard atualizados
