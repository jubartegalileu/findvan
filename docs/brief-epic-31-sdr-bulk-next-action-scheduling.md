# Project Brief: Epic 31 — SDR Bulk Next Action Scheduling

**Data:** 2026-03-02  
**Autor:** Atlas (@analyst) | **Revisão Arquitetural:** Aria (@architect)  
**Status:** Reviewed

---

## Context

Após os Epics 29 e 30 (atribuição em lote e marcação de feito em lote), o próximo passo operacional é agendar próxima ação para múltiplos leads em uma única execução.

## Problem

- Agendamento de próxima ação permanecia muito dependente do fluxo por card.
- Em operação de alto volume, ajuste de agenda para muitos leads no turno ficava lento.

## Goal

Habilitar agendamento em lote de próxima ação no SDR com baixo risco:
1. Reuso do endpoint batch com parâmetros de agendamento.
2. UI SDR com descrição/data/cadência para lote selecionado.
3. Guard rails de UX para sucesso parcial e mensagens consistentes.

## Scope

- `PATCH /api/sdr/action/batch` com `next_action_description`, `next_action_date`, `cadence_days`
- Bloco de agendamento em lote na aba SDR
- Testes de API + UI + regressão SDR/Funil

## Out of Scope

- Regras de capacidade por vendedor
- Sugestão automática de data/hora ótima
- Dependência de calendário externo

## Success Criteria

- Operador agenda próxima ação para lote selecionado sem abrir cada card.
- Fluxo em lote mantém estabilidade de seleção e feedback em sucesso parcial.
- Gates de backend e dashboard permanecem verdes.
