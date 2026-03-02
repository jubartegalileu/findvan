# Epic 4 — Leads v2: Score Dinamico, Funil & Operacao SDR

**PRD:** PRD-V2-DASHBOARD-SCRAPER-LEADS.md
**Status:** Closed
**Prioridade:** P0 (Must Have)
**Wave:** 1
**Estimativa:** 2-3 semanas
**Owner:** @pm (Morgan)

---

## Objetivo

Transformar a tela de Leads de uma **lista estatica** em um **painel operacional** com score inteligente, ciclo de vida por funil, acoes em lote, e insights de conversao.

## Problema

- **Score fixo (80 para todos):** Impossivel priorizar quem contactar primeiro
- **Status unico ("Qualificado"):** Sem jornada do lead — nao sabe se foi contactado, se respondeu
- **Sem acoes em lote:** Nao da para selecionar 10 leads e adicionar a campanha
- **Insights rasos:** 3 numeros estaticos (total, validos, duplicados) — sem metricas de conversao
- **Modal basico:** Sem historico de interacao, sem breakdown de score, sem notas

## Valor de Negocio

- **Priorizacao real:** SDR contacta primeiro leads com score alto e dados completos
- **Visibilidade do ciclo de vida:** Saber onde cada lead esta no funil
- **Produtividade:** Acoes em lote economizam tempo (tagear, adicionar a campanha)
- **Inteligencia:** Insights mostram taxa de conversao por estagio, identificam gargalos
- **Contexto completo:** Modal com historico evita recontato ou mensagem duplicada

---

## Stories Planejadas

### Story 4.1 — Score Dinamico Calculado por Completude (P0)
**RF:** RF-L1
**Complexidade:** Media (3 pontos)
**Descricao:** Substituir score fixo (80) por calculo baseado em completude dos dados do lead.

**Formula:**
| Componente | Pontos |
|-----------|--------|
| Telefone valido | +25 |
| Email presente | +15 |
| Endereco completo | +15 |
| CNPJ presente | +15 |
| Nome completo | +10 |
| URL Google Maps | +5 |
| Cidade identificada | +5 |
| Estado identificado | +5 |
| Fonte confiavel | +5 |
| **Total maximo** | **100** |

**Ranges visuais:**
- 90-100: Verde (Excelente)
- 70-89: Azul (Bom)
- 50-69: Amarelo (Regular)
- < 50: Vermelho (Fraco)

**AC:**
- [ ] Score calculado automaticamente ao importar lead
- [ ] Score recalculado quando lead e editado
- [ ] Badge colorido no card do lead
- [ ] Tooltip mostra breakdown do score
- [ ] Filtro por range de score
- [ ] Ordenacao por score (default: maior primeiro)
- [ ] Migration script recalcula score de todos os leads existentes

**Dependencias:** Nenhuma

### Story 4.2 — Status do Funil com 6 Estagios (P0)
**RF:** RF-L2
**Complexidade:** Media (3 pontos)
**Descricao:** Adicionar ciclo de vida ao lead com 6 estagios e transicoes definidas.

**Estagios e transicoes:**
```
Novo ──→ Contactado ──→ Respondeu ──→ Interessado ──→ Convertido
  │          │              │              │
  └──────────┴──────────────┴──────────────┴──→ Perdido (+ motivo)
```

**Motivos de perda (obrigatorios):**
1. Sem interesse
2. Ja tem fornecedor
3. Preco alto
4. Sem resposta (apos 3 tentativas)
5. Numero invalido/bloqueado
6. Outro (campo livre)

**AC:**
- [ ] Campo funnel_status (enum) no modelo de lead
- [ ] Badge colorido por status no card
- [ ] Dropdown de mudanca de status no modal
- [ ] Motivo obrigatorio quando status = Perdido
- [ ] Historico de mudancas (audit trail na tabela lead_interactions)
- [ ] Filtro por status na tela de leads
- [ ] Migration: todos os leads existentes recebem status "novo"

**Dependencias:** Tabela lead_interactions (nova)

### Story 4.3 — Filtros Expandidos (P0)
**RF:** RF-L3
**Complexidade:** Media (3 pontos)
**Descricao:** Adicionar novos filtros combinaveis: status do funil (multi-select), range de score, fonte, tags, data de captura.

**AC:**
- [ ] Filtro de status: checkboxes multi-select
- [ ] Filtro de score: dropdown com ranges (90-100, 70-89, 50-69, <50)
- [ ] Filtro de fonte: dropdown (google_maps, manual, futuro: facebook)
- [ ] Filtro de tags: multi-select (quando tags implementadas)
- [ ] Todos os filtros combinaveis (AND logic)
- [ ] Contador de resultados atualiza em tempo real
- [ ] Botao "Limpar filtros"
- [ ] Estado persiste na sessao (nao reseta ao navegar)

**Dependencias:** Story 4.1 (score), Story 4.2 (status)

### Story 4.4 — Acoes em Lote (P0)
**RF:** RF-L4
**Complexidade:** Media (3 pontos)
**Descricao:** Selecao multipla de leads com barra de acoes: adicionar a campanha, tagear, exportar CSV, alterar status, excluir.

**AC:**
- [ ] Checkbox individual por lead
- [ ] Checkbox "Selecionar todos" (da pagina atual)
- [ ] Barra de acoes aparece quando >= 1 lead selecionado
- [ ] Contador "X selecionados"
- [ ] Acao: Adicionar a campanha (seleciona campanha existente)
- [ ] Acao: Alterar status (seleciona novo status)
- [ ] Acao: Exportar CSV (baixa arquivo)
- [ ] Acao: Excluir (confirmacao obrigatoria, soft delete)
- [ ] Feedback de sucesso/erro apos cada acao
- [ ] Acao: Tagear (disponivel apos Story 4.8)

**Dependencias:** Story 4.2 (status para acao de alterar status)

### Story 4.5 — Cards de Lead Enriquecidos (P1)
**RF:** RF-L5
**Complexidade:** Media (3 pontos)
**Descricao:** Redesign dos cards de lead com: indicadores de completude (icones check/x para tel, email, end, cnpj), tags, preview da ultima mensagem, alerta de follow-up vencido, botoes de acao rapida.

**AC:**
- [ ] Card mostra: nome, cidade, tel, score badge, status badge
- [ ] Icones de completude: telefone, email, endereco, CNPJ (verde check / vermelho x)
- [ ] Tags exibidas como chips coloridos (se houver)
- [ ] Preview de 1 linha da ultima mensagem enviada/recebida
- [ ] Alerta visual se follow-up vencido (borda ou badge amarelo)
- [ ] Destaque visual para leads que responderam (borda verde)
- [ ] Botoes: [Contactar] [Ver] [Menu ...]
- [ ] Performance: 100 cards em < 500ms

**Dependencias:** Story 4.1 (score), Story 4.2 (status)

### Story 4.6 — Sidebar de Insights Inteligentes (P1)
**RF:** RF-L6
**Complexidade:** Grande (5 pontos)
**Descricao:** Sidebar direita com: resumo (total, validos, duplicados), contagem por status do funil, taxas de conversao entre estagios, distribuicao de score (mini histograma), top cidades, alertas clicaveis.

**AC:**
- [ ] Secao "Resumo": total, validos, duplicados
- [ ] Secao "Por Status": contagem por estagio com icones
- [ ] Secao "Conversao": taxa entre cada estagio adjacente + taxa total
- [ ] Secao "Score": mini histograma com 4 ranges
- [ ] Secao "Top Cidades": ranking top 3
- [ ] Secao "Alertas": respostas pendentes, follow-ups vencidos
- [ ] Dados refletem filtros aplicados (se filtrar por cidade, insights sao daquela cidade)
- [ ] Alertas clicaveis (aplicam filtro correspondente)

**Dependencias:** Story 4.2 (status), Story 4.3 (filtros), Story 4.1 (score)

### Story 4.7 — Modal Redesenhado com 4 Tabs (P1)
**RF:** RF-L7
**Complexidade:** Grande (5 pontos)
**Descricao:** Reorganizar modal de detalhes em 4 abas: Dados (campos + tags + proxima acao), Historico (timeline de interacoes), Score (breakdown visual), Notas (CRUD de notas).

**AC:**
- [ ] Tab "Dados" como default: todos os campos editaveis + status dropdown + campo proxima acao
- [ ] Tab "Historico": timeline cronologica (mais recente primeiro) com: msg enviada, resposta, nota, mudanca de status
- [ ] Tab "Score": breakdown dos 9 componentes com check/x + total + dica para melhorar
- [ ] Tab "Notas": campo para adicionar + lista de notas anteriores com data/autor
- [ ] Navegacao entre tabs sem perder dados editados
- [ ] Botao "Enviar mensagem" visivel em todas as tabs
- [ ] Botao "Salvar" persiste todas as alteracoes de todas as tabs

**Dependencias:** Story 4.1 (score), Story 4.2 (status), tabelas lead_notes e lead_interactions

### Story 4.8 — Tags Customizaveis (P2)
**RF:** RF-L8
**Complexidade:** Media (3 pontos)
**Descricao:** Sistema de tags para classificacao manual. Tags sao strings livres, cores automaticas (pool de 8), autocomplete de tags existentes, aplicaveis individualmente ou em lote. Pre-criadas: "prioridade alta", "grande frota", "indicacao", "retornar depois".

**AC:**
- [ ] Campo de tags no modal (tab Dados)
- [ ] Autocomplete com tags existentes ao digitar
- [ ] Cores automaticas do pool
- [ ] Tags visiveis no card do lead no pipeline
- [ ] Filtro por tag na tela de leads
- [ ] Acao em lote "Tagear" funcional
- [ ] 4 tags pre-criadas no primeiro uso
- [ ] Tabela lead_tags no banco

**Dependencias:** Story 4.4 (acoes em lote), Story 4.5 (cards enriquecidos)

---

## Dependencias entre Stories

```
Story 4.1 (Score) ──────────┐
                             ├──→ Story 4.3 (Filtros) ──→ Story 4.6 (Insights)
Story 4.2 (Status/Funil) ──┤
                             ├──→ Story 4.4 (Acoes lote) ──→ Story 4.8 (Tags)
                             ├──→ Story 4.5 (Cards)
                             └──→ Story 4.7 (Modal tabs)
```

## Dependencias de Outros Epics

| Dependencia | Direcao | Motivo |
|-------------|---------|--------|
| Epic 2 depende de 4.2 | Epic 4 → Epic 2 | Dashboard KPIs e funil precisam de funnel_status |
| Epic 3 independente | — | Scraper v2 nao depende de Leads v2 |

**CRITICO:** Story 4.1 (Score) e Story 4.2 (Status) devem ser as primeiras implementadas pois sao dependencias de quase todas as outras stories neste epic E no Epic 2.

## Ordem de Implementacao Sugerida

```
Wave 1a (Fundacao):
  Story 4.1 (Score) + Story 4.2 (Status) [paralelo]

Wave 1b (Core):
  Story 4.3 (Filtros) + Story 4.4 (Acoes lote) [paralelo, dependem de 4.1+4.2]

Wave 1c (UX):
  Story 4.5 (Cards) + Story 4.6 (Insights) + Story 4.7 (Modal) [paralelo]

Wave 1d (Polish):
  Story 4.8 (Tags)
```

## Criterios de Aceite do Epic

- [x] Score dinamico calculado para todos os leads (nenhum com score fixo 80)
- [x] Todos os leads possuem status do funil (nenhum sem classificacao)
- [x] Filtros por status e score funcionam corretamente
- [ ] Acoes em lote executam sem erros para 50 leads simultaneos
- [ ] Modal com 4 tabs navegaveis e funcionais
- [ ] Insights mostram metricas de conversao reais

## Definition of Done

- [ ] Todas as stories P0 implementadas e testadas
- [ ] Migration script executado: todos os leads tem score e status
- [ ] Teste manual: alterar status de 5 leads e verificar funil
- [ ] Teste manual: filtrar por score > 80 e verificar resultado
- [ ] Teste manual: selecionar 10 leads e adicionar a campanha
- [ ] Performance: lista de 100 leads em < 500ms
- [ ] Sem regressoes nas funcionalidades existentes

## Closure Note (2026-03-02)

- Epic 4 foi parcialmente entregue pelas stories rastreadas `4.1` e `4.2` (ambas `Done`).
- As stories planejadas `4.3` a `4.8` nao existem como artefatos `4.x` no backlog atual e foram absorvidas/superseded por epics posteriores da linha SDR/Funil (19-28), com implementacoes distribuidas no stack atual.
- Decisao PO/PM: encerrar este epic legado como `Closed` e seguir evolucao pelos epics mais recentes.

---

## Schema Changes (referencia)

```sql
-- Novos campos em leads
ALTER TABLE leads ADD COLUMN funnel_status VARCHAR(20) DEFAULT 'novo';
ALTER TABLE leads ADD COLUMN loss_reason VARCHAR(50);
ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN next_action_date TIMESTAMP;
ALTER TABLE leads ADD COLUMN next_action_description TEXT;

-- Novas tabelas
CREATE TABLE lead_tags (...);
CREATE TABLE lead_notes (...);
CREATE TABLE lead_interactions (...);
```

Ver PRD-V2 Secao 7.1 para schema completo.
