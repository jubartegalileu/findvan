# Project Brief: Epic 36 — SDR Template Favorites & Ordering

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisao Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Depois da persistencia compartilhada (Epic 35), o proximo passo de produtividade e priorizar templates mais usados por vendedor.

## Goal

Adicionar favoritos e ordenacao de templates custom no SDR:
1. backend com preferencia de favorito e ordem;
2. painel SDR com acoes Favoritar/Subir/Descer;
3. regressao completa SDR/Funil verde.

## Scope

- campos `is_favorite` e `sort_order` em `sdr_bulk_templates`
- endpoint `PATCH /api/sdr/templates/{id}`
- UI SDR para favoritar e ordenar templates custom
- testes backend e dashboard atualizados
