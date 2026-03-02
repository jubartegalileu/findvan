# Project Brief: Epic 38 — SDR Template Audit Trail

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisao Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Epic 37 concluiu governanca de owner scope para templates SDR. Um item explicitamente fora de escopo foi `auditoria historica de alteracao de templates`.

## Goal

Adicionar trilha de auditoria para alteracoes em templates SDR:
1. registrar eventos de criacao/edicao/exclusao/preferencia;
2. expor consulta de auditoria por owner/template;
3. validar release com gate QA/PO.

## Scope

- persistencia de eventos de auditoria para templates SDR
- registro de eventos em save/delete/patch
- endpoint de leitura de auditoria
- cobertura de testes backend + smoke dashboard

## Out of Scope

- RBAC/permissoes por equipe
- compartilhamento cross-tenant
- analytics avancado de produtividade
