# Project Brief: Epic 34 — SDR Persistent Custom Templates

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisao Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Com templates rapidos em lote ja disponiveis (Epic 33), o proximo ganho e permitir templates custom persistentes por vendedor para reduzir repeticao no turno.

## Goal

Adicionar persistencia local de templates custom no SDR por filtro de vendedor:
1. salvar/excluir template custom no painel de lote;
2. carregar templates por contexto de vendedor;
3. manter regressao SDR/Funil verde.

## Scope

- persistencia em `localStorage` por `sellerFilter`
- acoes `Salvar template` e `Excluir template`
- teste de persistencia por vendedor
