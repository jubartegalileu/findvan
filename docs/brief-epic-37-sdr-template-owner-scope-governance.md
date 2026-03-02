# Project Brief: Epic 37 — SDR Template Owner Scope Governance

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisao Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Epic 36 fechou favoritos/ordenacao e o follow-up adicionou escopo de templates (`seller`, `team`, `global`) no SDR.
O proximo passo e endurecer governanca de `owner` para reduzir ambiguidade entre namespaces e garantir comportamento consistente em API/UI.

## Goal

Padronizar owner scope dos templates SDR sem quebrar contratos atuais:
1. normalizacao/validacao leve de owner no backend;
2. UX SDR com feedback claro para owner scope e equipe;
3. gate final QA/PO com regressao verde.

## Scope

- helper de normalizacao de owner para templates SDR
- regras para `all`, `team:<nome>` e owner de vendedor
- validacao de payload no endpoint de templates
- refinamento UX no seletor de escopo/equipe
- testes backend + dashboard atualizados

## Out of Scope

- RBAC/permissoes por equipe
- compartilhamento cross-tenant
- auditoria historica de alteracao de templates
