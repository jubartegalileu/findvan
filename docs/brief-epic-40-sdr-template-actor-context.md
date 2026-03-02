# Project Brief: Epic 40 — SDR Template Actor Context Hardening

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisao Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Epic 39 introduziu permissoes por equipe para mutacoes de templates SDR. O proximo passo e endurecer o contexto de `actor` para evitar bypass implicito em operacoes sensiveis de escopo global.

## Goal

Aplicar contexto de actor explicito no fluxo de templates:
1. exigir actor admin para mutacao global;
2. propagar actor efetivo no dashboard;
3. validar release com gate QA/PO.

## Scope

- policy backend para actor explicito em mutacoes de template
- regra de `admin` para escopo global (`all`)
- propagacao de actor em POST/PATCH/DELETE no dashboard SDR
- testes backend + dashboard atualizados

## Out of Scope

- IAM corporativo completo
- UI de administracao de papeis
- compartilhamento cross-tenant
