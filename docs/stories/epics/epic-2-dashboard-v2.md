# Epic 2 — Dashboard v2: Visibilidade Operacional

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md
**Status:** Closed
**Prioridade:** P0 (Must Have)
**Wave:** 1
**Estimativa:** 1.5-2 semanas
**Owner:** @pm (Morgan)

---

## Objetivo

Transformar o Dashboard de uma tela focada em captacao para um **centro de comando operacional** que mostra funil, urgencias e performance da operacao SDR.

## Problema

O gestor abre o Dashboard e ve apenas quantos leads foram capturados. Nao sabe:
- Quantos leads foram contactados
- Se alguem respondeu e esta esperando atendimento
- Se a operacao esta convertendo ou nao
- Tendencia da semana (melhorando ou piorando)

## Valor de Negocio

- **Reduz tempo de reacao:** Lead que responde e atendido em minutos, nao horas
- **Visibilidade de conversao:** Saber se o esforco de prospecao esta dando resultado
- **Priorizacao:** SDR sabe exatamente o que fazer ao abrir o app

---

## Stories Planejadas

### Story 2.1 — KPIs Expandidos (P0)
**RF:** RF-D1
**Complexidade:** Pequena (2 pontos)
**Descricao:** Expandir de 3 para 6 cards de KPI no topo do Dashboard. Novos KPIs: Leads contactados, Taxa de resposta, Conversoes do mes.
**Dependencias:** Schema com campo funnel_status nos leads (Epic 4, Story 4.2)

### Story 2.2 — Mini-Funil Visual (P0)
**RF:** RF-D2
**Complexidade:** Media (3 pontos)
**Descricao:** Widget com barras horizontais mostrando distribuicao dos leads nos 6 estagios do funil. Inclui taxa de conversao geral e link para tela de Leads filtrada.
**Dependencias:** Story 2.1 (KPIs precisam existir), Epic 4 Story 4.2 (status do funil)

### Story 2.3 — Widget de Acoes Urgentes (P0)
**RF:** RF-D3
**Complexidade:** Media (3 pontos)
**Descricao:** Card com 3 tipos de alerta priorizados: respostas pendentes (vermelho), follow-ups vencidos (amarelo), novos leads para contactar (verde). Clique redireciona para Leads com filtro.
**Dependencias:** Story 2.2, Epic 4 Story 4.2 (status do funil)

### Story 2.4 — Performance Semanal com Grafico (P1)
**RF:** RF-D4
**Complexidade:** Media (3 pontos)
**Descricao:** Widget com metricas de WhatsApp (enviadas, entrega, resposta, bloqueio) e sparkline de 7 dias usando Chart.js. Alerta visual se taxa de bloqueio > 5%.
**Dependencias:** Dados de campanhas WhatsApp existentes

### Story 2.5 — Atividade Unificada (P1)
**RF:** RF-D5
**Complexidade:** Media (5 pontos)
**Descricao:** Substituir timeline apenas de scraper por timeline que mostra: scraper, mensagens enviadas, respostas recebidas, mudancas de status, campanhas. Tabela activity_log no backend. Polling 30s.
**Dependencias:** Tabela activity_log (nova), todos os modulos logando eventos

### Story 2.6 — Acoes Rapidas nos Leads Recentes (P2)
**RF:** RF-D6
**Complexidade:** Pequena (2 pontos)
**Descricao:** Botoes [Contactar] e [Ver] em cada lead da lista de leads recentes no Dashboard.
**Dependencias:** Modal de detalhes do lead existente

---

## Dependencias entre Stories

```
Story 2.1 (KPIs) ─────┐
                       ├──→ Story 2.2 (Funil) ──→ Story 2.3 (Urgentes)
Epic 4, Story 4.2 ────┘
                                                    Story 2.4 (Performance) [independente]
Story 2.5 (Atividade) [independente, mas precisa de activity_log]
Story 2.6 (Acoes rapidas) [independente]
```

## Dependencias de Outros Epics

| Dependencia | Epic | Story | Motivo |
|-------------|------|-------|--------|
| Campo funnel_status nos leads | Epic 4 | 4.2 | KPIs e funil dependem de status |
| Tabela activity_log | Epic 4 | 4.2 ou migration separada | Atividade unificada |

## Criterios de Aceite do Epic

- [ ] Dashboard exibe 6 KPIs com dados reais
- [ ] Mini-funil visual mostra distribuicao por estagio
- [ ] Alertas urgentes destacam leads que precisam de atencao
- [ ] Performance semanal com grafico de tendencia
- [ ] Timeline unificada com todos os tipos de evento
- [ ] Tempo de carga do Dashboard < 2s

## Definition of Done

- [ ] Todas as stories P0 implementadas e testadas
- [ ] Dados calculados corretamente (validado manualmente com 10 leads)
- [ ] Performance: Dashboard carrega em < 2s
- [ ] Responsivo: funciona em 1280x720 e 1920x1080
- [ ] Sem regressoes nas funcionalidades existentes

## Closure Note (2026-03-02)

- Epic legado fechado por supersessao de roadmap.
- Apenas `2.1.story.md` existe como artefato `2.x`; demais stories planejadas nao estao presentes no backlog como arquivos rastreaveis.
- Entregas de Dashboard/SDR/Funil foram consolidadas em epics posteriores (24-28) com gates e relatorios de QA.
- Decisao PO/PM: `Closed` para manter backlog consistente com o estado atual do produto.
