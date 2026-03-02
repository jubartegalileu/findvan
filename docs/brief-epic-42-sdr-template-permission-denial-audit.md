# Project Brief: Epic 42 — SDR Template Permission Denial Audit

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisao Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Epic 41 adicionou precheck de permissao para mutacoes de template. O passo seguinte e rastrear tentativas bloqueadas (`403`) para observabilidade operacional.

## Goal

Auditar negacoes de permissao em templates SDR:
1. registrar eventos de bloqueio no backend;
2. exibir sinal de bloqueios recentes no dashboard;
3. validar release com gate QA/PO.

## Scope

- log de `permission_denied` nas mutacoes de template
- filtro por `action` no endpoint de auditoria
- painel SDR com resumo de bloqueios recentes por owner
- testes backend + dashboard atualizados

## Out of Scope

- analytics avancado de risco
- UI dedicada de forense
- IAM corporativo completo
