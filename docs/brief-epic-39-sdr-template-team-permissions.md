# Project Brief: Epic 39 — SDR Template Team Permissions

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisao Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Epic 38 concluiu auditoria historica de templates SDR. O item restante de maior impacto operacional no backlog imediato e `RBAC/permissoes por equipe` para namespaces de template.

## Goal

Introduzir permissao por equipe para operacoes de templates SDR:
1. impedir mutacao fora do owner scope autorizado;
2. manter leitura previsivel por scope;
3. validar release com gate QA/PO.

## Scope

- policy backend para validacao de owner scope por actor
- enforcement em mutacoes de template (POST/PATCH/DELETE)
- contrato explicito de erro para acesso negado
- ajuste de testes backend e dashboard para cenarios permitidos/negados

## Out of Scope

- IAM corporativo completo
- compartilhamento cross-tenant
- UI de administracao de papeis
