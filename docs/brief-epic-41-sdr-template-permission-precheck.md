# Project Brief: Epic 41 — SDR Template Permission Precheck

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisao Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Epic 40 endureceu actor context nas mutacoes de templates SDR. O proximo passo operacional e evitar tentativa de operacao bloqueada antes do submit, com precheck de permissao.

## Goal

Adicionar precheck de permissao para templates SDR:
1. endpoint backend de avaliacao de permissao (owner+actor);
2. dashboard com estado de permissao antes das mutacoes;
3. gate final QA/PO.

## Scope

- endpoint `GET /api/sdr/templates/permission`
- service de avaliacao de permissao reutilizando policy existente
- dashboard SDR exibindo estado permitido/bloqueado
- bloqueio de botoes de mutacao quando permissao negada
- testes backend + dashboard atualizados

## Out of Scope

- IAM corporativo completo
- UI de administracao de papeis
- compartilhamento cross-tenant
