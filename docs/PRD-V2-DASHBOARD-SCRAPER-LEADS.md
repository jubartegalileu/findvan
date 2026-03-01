# PRD v2 — Melhorias Dashboard, Scraper & Leads

**Versao:** 2.0.0
**Data:** 2026-02-28
**Status:** Draft
**Autor:** @pm (Morgan) com analise de @analyst (Atlas)
**Baseline:** PRD-MODULES.md v1.0.0 (Modulos 1-4)
**Publico:** Flavio + Socio (Operadores/Founders)

---

## 1. Contexto & Motivacao

### 1.1 Situacao Atual

O FindVan possui 6 telas funcionais (Dashboard, Scraper, Leads, WhatsApp, Campanhas, Configuracoes) com o Modulo 1 (Scraper) 85% implementado e as telas de UI ja construidas. O fluxo basico funciona: scraper coleta leads do Google Maps, armazena em banco, e exibe na interface.

### 1.2 Problema Identificado

As telas atuais sao **focadas 100% em captacao**. Nao ha visibilidade sobre:
- O que acontece **depois** que o lead entra (foi contactado? respondeu?)
- Qualidade real dos leads (score fixo de 80 para todos)
- Performance da operacao de SDR (taxa de resposta, conversao)
- Problemas nas coletas (0 leads em SP sem explicacao)

### 1.3 Objetivo deste PRD

Evoluir as 3 telas principais (Dashboard, Scraper, Leads) de **ferramentas de captacao** para **ferramentas de operacao SDR completa**, adicionando visibilidade de funil, score inteligente, e feedback acionavel.

### 1.4 Metricas de Sucesso

| Metrica | Antes | Depois | Meta |
|---------|-------|--------|------|
| Tempo para identificar lead quente | Manual, sem visibilidade | Alerta automatico | < 5 min |
| Score diferenciado entre leads | Todos 80 (fixo) | 0-100 dinamico | Variacao real |
| Visibilidade do funil | Inexistente | 6 estagios visiveis | 100% dos leads classificados |
| Feedback de scraper com 0 resultados | Nenhum | Sugestao automatica | 100% dos casos |
| Acoes em lote na tela de leads | Impossivel | Selecao multipla + acoes | Disponivel |

---

## 2. Escopo

### 2.1 IN SCOPE

- **Dashboard:** Novos KPIs, mini-funil, acoes urgentes, performance semanal, atividade unificada
- **Scraper:** Keywords customizaveis, feedback inteligente, pipeline transparente, agendamento, cobertura
- **Leads:** Score dinamico, status do funil, acoes em lote, cards enriquecidos, modal com tabs

### 2.2 OUT OF SCOPE

- Novas telas (Funil e SDR serao PRDs separados)
- Mudancas no backend/API (apenas frontend neste PRD, API em PRD complementar)
- Integracao WhatsApp Business API
- Integracao com novas fontes OSINT (Facebook, LinkedIn)
- Deploy/infraestrutura

---

## 3. Requisitos Funcionais — Dashboard

### RF-D1: KPIs Expandidos (P0)

Expandir de 3 para 6 cards de KPI no topo do Dashboard.

**KPIs atuais (manter):**
| KPI | Fonte |
|-----|-------|
| Leads validos | COUNT(leads WHERE is_valid=true) |
| Coletas hoje | COUNT(scrape_jobs WHERE date=today) |
| Leads capturados 24h | COUNT(leads WHERE captured_at > now-24h) |

**KPIs novos (adicionar):**
| KPI | Calculo | Icone |
|-----|---------|-------|
| Leads contactados | COUNT(leads WHERE status != 'novo') | Telefone |
| Taxa de resposta | COUNT(status='respondeu') / COUNT(status='contactado') * 100 | Porcentagem |
| Conversoes do mes | COUNT(status='convertido' WHERE month=current) | Grafico |

**Criterios de Aceite:**
- [ ] 6 cards exibidos em linha responsiva
- [ ] Dados calculados em tempo real (ou cache de 5 min)
- [ ] Cada card mostra valor principal + subtexto contextual
- [ ] Loading skeleton enquanto carrega

### RF-D2: Mini-Funil Visual (P0)

Widget mostrando distribuicao dos leads por estagio do funil.

**Estagios:**
1. Novo (icone: circulo azul)
2. Contactado (icone: telefone)
3. Respondeu (icone: balao)
4. Interessado (icone: estrela)
5. Convertido (icone: check verde)
6. Perdido (icone: X vermelho)

**Visualizacao:**
- Barras horizontais proporcionais ao numero de leads em cada estagio
- Numero absoluto + porcentagem ao lado de cada barra
- Taxa de conversao geral no rodape do widget
- Link "Ver funil completo" (futura tela Funil)

**Criterios de Aceite:**
- [ ] Widget renderiza com dados reais
- [ ] Barras proporcionais ao total de leads
- [ ] Clique na barra filtra leads na tela de Leads
- [ ] Atualiza junto com os KPIs (mesma cadencia)

### RF-D3: Widget de Acoes Urgentes (P0)

Card destacando itens que requerem atencao imediata do SDR.

**Tipos de alerta (prioridade):**
| Alerta | Icone | Cor | Condicao |
|--------|-------|-----|----------|
| Respostas pendentes | Vermelho | #E53935 | Leads com status='respondeu' sem acao ha > 2h |
| Follow-ups vencidos | Amarelo | #F9A825 | Leads com proximo_contato < now |
| Novos leads para contactar | Verde | #43A047 | Leads com status='novo' |

**Criterios de Aceite:**
- [ ] Alertas ordenados por prioridade (vermelho > amarelo > verde)
- [ ] Numero de leads em cada categoria
- [ ] Clique redireciona para tela de Leads com filtro aplicado
- [ ] Botao "Abrir SDR" (futura tela, por enquanto vai para Leads)
- [ ] Widget vazio mostra "Tudo em dia!" com icone de check

### RF-D4: Performance Semanal (P1)

Widget com metricas de WhatsApp e grafico de tendencia 7 dias.

**Metricas exibidas:**
- Mensagens enviadas (total semana)
- Taxa de entrega (%)
- Taxa de resposta (%)
- Taxa de bloqueio (% — com alerta se > 5%)

**Grafico:**
- Sparkline ou mini-grafico de barras dos ultimos 7 dias
- Eixo Y: mensagens enviadas
- Tooltip com detalhes por dia

**Criterios de Aceite:**
- [ ] Metricas calculadas dos ultimos 7 dias
- [ ] Grafico renderizado (Chart.js)
- [ ] Alerta visual se taxa de bloqueio > 5%
- [ ] Fallback "Sem dados de envio" se nenhuma campanha ativa

### RF-D5: Atividade Unificada (P1)

Substituir o widget de atividade atual (apenas scraper) por timeline unificada.

**Tipos de evento:**
| Tipo | Icone | Exemplo |
|------|-------|---------|
| Scraper | Lupa | "Scraper Campinas/SP: 8 leads inseridos" |
| Mensagem enviada | Seta saindo | "Msg enviada para R&R transporte" |
| Resposta recebida | Seta entrando | "Resposta de Ambrosi Transp." |
| Status alterado | Circulo | "VIA REAL movido para Interessado" |
| Campanha | Megafone | "Campanha Volta as aulas: 220 enviadas" |

**Criterios de Aceite:**
- [ ] Timeline mostra ultimos 20 eventos
- [ ] Icone + cor por tipo de evento
- [ ] Timestamp relativo ("ha 12 min")
- [ ] Link "Ver historico" para lista completa
- [ ] Eventos em tempo real (polling 30s ou WebSocket)

### RF-D6: Acoes Rapidas nos Leads Recentes (P2)

Adicionar botoes de acao na lista de leads recentes.

**Botoes por lead:**
- [Contactar] — Abre modal de envio de mensagem
- [Ver] — Abre modal de detalhes do lead

**Criterios de Aceite:**
- [ ] Botoes visiveis em cada linha de lead recente
- [ ] Contactar abre flow de envio de template
- [ ] Ver abre modal de detalhes (mesmo da tela Leads)

---

## 4. Requisitos Funcionais — Scraper

### RF-S1: Keywords Customizaveis (P0)

Permitir que o usuario edite as palavras-chave de busca.

**Comportamento:**
- Campo de texto multi-valor (tags/chips)
- Default: "transporte escolar"
- Permite adicionar: "van escolar", "fretamento escolar", "micro onibus escolar"
- Salva por cidade (keywords diferentes para SP vs interior)

**Criterios de Aceite:**
- [ ] Campo de keywords no formulario de coleta (secao "Opcoes Avancadas")
- [ ] Permite multiplas keywords separadas por virgula
- [ ] Keywords salvas e reutilizaveis por cidade
- [ ] Scraper executa busca para cada keyword

### RF-S2: Feedback Inteligente (P0)

Quando uma coleta retorna 0 leads, mostrar explicacao e sugestoes.

**Regras de feedback:**
| Condicao | Mensagem |
|----------|----------|
| 0 leads na execucao | "Nenhum resultado encontrado para '{keyword}' em {cidade}" |
| 0 leads em 3+ execucoes | "Cidade com baixo rendimento — tente keywords diferentes" |
| Sugestao | "Sugestoes: 'van escolar {cidade}', 'transporte escolar zona {regiao}'" |
| Erro de rede | "Falha de conexao — verifique sua internet e tente novamente" |
| Timeout | "Busca excedeu o tempo limite — tente reduzir a quantidade" |

**Criterios de Aceite:**
- [ ] Banner de alerta (amarelo) exibido em execucoes com 0 leads
- [ ] Sugestoes de keywords alternativas
- [ ] Contador de execucoes consecutivas com 0 resultados
- [ ] Botao "Editar keywords" direto no alerta

### RF-S3: Pipeline de Resultados Transparente (P0)

Mostrar o fluxo completo de cada coleta: encontrados > validos > duplicados > novos.

**Visualizacao por execucao:**
```
Encontrados: 50 → Validos: 48 → Duplicados: 12 → Novos: 36
```

**Criterios de Aceite:**
- [ ] Cada execucao mostra os 4 numeros do pipeline
- [ ] Barra de progresso segmentada (cores diferentes por etapa)
- [ ] Tooltip com detalhes ("12 duplicados por telefone ja existente")

### RF-S4: Agendamento de Coletas (P1)

Permitir agendar coletas recorrentes.

**Opcoes:**
- Frequencia: Diaria, Semanal (dia da semana), Mensal
- Horario de execucao
- Cidade + Estado + Keywords
- Quantidade maxima por execucao
- Ativar/Desativar agendamento

**Criterios de Aceite:**
- [ ] Formulario de criacao de agendamento
- [ ] Lista de agendamentos ativos com toggle on/off
- [ ] Execucao automatica via Celery/cron
- [ ] Log de execucoes agendadas na timeline de atividade
- [ ] Limite de 5 agendamentos simultaneos (MVP)

### RF-S5: Mapa de Cobertura (P2)

Sidebar mostrando quais estados/cidades ja foram coletados.

**Visualizacao:**
- Lista de estados com barra proporcional ao numero de cidades
- Total de cidades ativas e media de leads/cidade
- Sugestao de proxima cidade (baseado em populacao)

**Criterios de Aceite:**
- [ ] Widget na sidebar direita do Scraper
- [ ] Dados calculados do historico de scrape_jobs
- [ ] Sugestao de proxima cidade (hardcoded inicialmente, baseado em capitais)

### RF-S6: Opcoes Avancadas (P1)

Toggle "Avancado" no formulario de coleta com opcoes extras.

**Opcoes:**
- [x] Ignorar leads ja existentes no banco (default: on)
- [x] Validar telefone antes de salvar (default: on)
- [ ] Buscar CNPJ automaticamente (default: off, mais lento)
- Fonte: Google Maps (futuro: Instagram, Lista manual)

**Criterios de Aceite:**
- [ ] Toggle "Avancado" mostra/esconde opcoes
- [ ] Checkboxes funcionais com estado persistente
- [ ] Opcao "Ignorar existentes" verifica banco antes de inserir
- [ ] Fonte como radio button (Google Maps selecionado, outros disabled com "Em breve")

---

## 5. Requisitos Funcionais — Leads

### RF-L1: Score Dinamico (P0)

Substituir score fixo (80) por calculo baseado em completude dos dados.

**Formula:**

| Componente | Pontos | Condicao |
|-----------|--------|----------|
| Telefone valido | +25 | phone != null AND formato BR valido |
| Email presente | +15 | email != null AND formato valido |
| Endereco completo | +15 | address != null AND length > 10 |
| CNPJ presente | +15 | cnpj != null AND formato valido |
| Nome completo | +10 | name != null AND length > 3 |
| URL Google Maps | +5 | url != null |
| Cidade identificada | +5 | city != null |
| Estado identificado | +5 | state != null |
| Fonte confiavel | +5 | source IN ('google_maps', 'cnpj_lookup') |
| **Total maximo** | **100** | |

**Ranges visuais:**
| Range | Label | Cor | Icone |
|-------|-------|-----|-------|
| 90-100 | Excelente | Verde #43A047 | Circulo cheio |
| 70-89 | Bom | Azul #1E88E5 | Circulo 3/4 |
| 50-69 | Regular | Amarelo #F9A825 | Circulo metade |
| < 50 | Fraco | Vermelho #E53935 | Circulo 1/4 |

**Criterios de Aceite:**
- [ ] Score calculado automaticamente ao importar lead
- [ ] Score recalculado quando lead e editado
- [ ] Badge colorido no card do lead (cor por range)
- [ ] Tooltip mostra breakdown do score
- [ ] Filtro por range de score na tela de leads
- [ ] Ordenacao por score (maior primeiro como default)

### RF-L2: Status do Funil (P0)

Adicionar ciclo de vida ao lead com 6 estagios.

**Estagios:**

| Estagio | Transicao | Trigger |
|---------|-----------|---------|
| Novo | Automatico | Lead importado pelo scraper |
| Contactado | Manual/Auto | Primeira mensagem enviada |
| Respondeu | Automatico | Lead respondeu mensagem |
| Interessado | Manual | SDR marca como interessado |
| Convertido | Manual | Lead virou cliente |
| Perdido | Manual | SDR marca como perdido + motivo |

**Motivos de perda (obrigatorio ao marcar como Perdido):**
1. Sem interesse
2. Ja tem fornecedor
3. Preco alto
4. Sem resposta (apos 3 tentativas)
5. Numero invalido/bloqueado
6. Outro (campo livre)

**Criterios de Aceite:**
- [ ] Campo status no modelo de lead (enum)
- [ ] Badge colorido por status no card
- [ ] Dropdown de mudanca de status no modal de detalhes
- [ ] Motivo de perda obrigatorio quando status = Perdido
- [ ] Historico de mudancas de status (audit trail)
- [ ] Filtro por status na tela de leads

### RF-L3: Filtros Expandidos (P0)

Adicionar novos criterios de filtragem.

**Filtros atuais (manter):**
- Estado
- Cidade
- Busca por texto

**Filtros novos:**
- Status do funil (multi-select checkboxes)
- Range de score (min-max slider ou dropdown)
- Fonte (google_maps, facebook, cnpj_lookup, manual)
- Tags (multi-select)
- Data de captura (range picker)

**Criterios de Aceite:**
- [ ] Todos os filtros combinaveis (AND logic)
- [ ] Contador de resultados atualiza em tempo real
- [ ] Botao "Limpar filtros"
- [ ] Estado dos filtros persiste na sessao

### RF-L4: Acoes em Lote (P0)

Permitir selecionar multiplos leads e aplicar acoes.

**Acoes disponiveis:**
| Acao | Descricao |
|------|-----------|
| Adicionar a campanha | Seleciona campanha e adiciona leads |
| Tagear | Aplica tag(s) aos leads selecionados |
| Exportar | Exporta selecao como CSV |
| Alterar status | Muda status de todos os selecionados |
| Excluir | Soft delete com confirmacao |

**Criterios de Aceite:**
- [ ] Checkbox individual por lead + "Selecionar todos"
- [ ] Barra de acoes aparece quando >= 1 lead selecionado
- [ ] Contador "X selecionados"
- [ ] Confirmacao antes de acoes destrutivas (excluir)
- [ ] Feedback de sucesso/erro apos acao

### RF-L5: Cards Enriquecidos (P1)

Redesign dos cards de lead no pipeline com mais informacao.

**Campos no card:**
- Nome + empresa
- Cidade + estado + telefone
- Endereco + fonte
- Score (badge colorido) + Status do funil (badge)
- Indicadores de completude (tel, email, end, cnpj — com icones check/x)
- Tags (se houver)
- Ultima mensagem enviada/recebida (preview de 1 linha)
- Alerta se follow-up vencido
- Botoes de acao rapida: [Contactar] [Ver] [Menu ...]

**Criterios de Aceite:**
- [ ] Card mostra todas as informacoes sem precisar abrir modal
- [ ] Indicadores visuais de completude (icones verdes/vermelhos)
- [ ] Alerta visual para follow-ups vencidos (borda ou badge)
- [ ] Lead que respondeu tem destaque visual (borda colorida ou background)
- [ ] Performance: lista de 100 leads renderiza em < 500ms

### RF-L6: Sidebar de Insights Inteligentes (P1)

Substituir sidebar basica por painel com metricas acionaveis.

**Secoes:**

**Resumo:**
- Total de leads
- Leads validos
- Duplicados

**Por Status:**
- Contagem por estagio do funil com icones

**Conversao:**
- Taxa Novo > Contactado
- Taxa Contactado > Respondeu
- Taxa Respondeu > Interessado
- Taxa Interessado > Convertido
- Taxa total do pipeline

**Distribuicao de Score:**
- Mini histograma: 90-100, 70-89, 50-69, <50

**Top Cidades:**
- Ranking das 3 cidades com mais leads

**Alertas:**
- Respostas pendentes (vermelho)
- Follow-ups vencidos (amarelo)
- Saude WhatsApp (verde/vermelho)

**Criterios de Aceite:**
- [ ] Sidebar fixa na direita da tela de leads
- [ ] Dados refletem filtros aplicados (se filtrar por Campinas, insights sao de Campinas)
- [ ] Taxas de conversao calculadas corretamente
- [ ] Alertas clicaveis (aplicam filtro correspondente)

### RF-L7: Modal Redesenhado com Tabs (P1)

Reorganizar o modal de detalhes em 4 abas.

**Tab 1 — Dados (melhorado):**
- Todos os campos atuais
- Adicionar: Tags (editaveis), Proxima acao (data + descricao)
- Status como dropdown (nao mais badge estatico)

**Tab 2 — Historico:**
- Timeline cronologica de todas as interacoes
- Tipos: mensagem enviada, resposta recebida, nota do SDR, mudanca de status, agendamento
- Cada evento com: data/hora, tipo, conteudo, autor

**Tab 3 — Score:**
- Breakdown completo da pontuacao
- Cada componente com check verde ou X vermelho
- Dica: "Para aumentar o score, busque email e CNPJ"
- Score total destacado

**Tab 4 — Notas:**
- Campo de texto para adicionar notas
- Lista de notas anteriores com data/hora e autor
- Notas separadas de "Observacoes" (que fica na tab Dados)

**Criterios de Aceite:**
- [ ] 4 tabs navegaveis no modal
- [ ] Tab "Dados" como default ao abrir
- [ ] Tab "Historico" com timeline ordenada (mais recente primeiro)
- [ ] Tab "Score" com breakdown visual
- [ ] Tab "Notas" com CRUD de notas
- [ ] Status dropdown funcional com historico
- [ ] Botao "Enviar mensagem" visivel em todas as tabs

### RF-L8: Tags Customizaveis (P2)

Sistema de tags para classificacao manual de leads.

**Comportamento:**
- Tags sao strings livres criadas pelo usuario
- Cores automaticas (pool de 8 cores rotativas)
- Sugestoes ao digitar (autocomplete de tags existentes)
- Tags aplicaveis individualmente ou em lote

**Tags sugeridas (pre-criadas):**
- "prioridade alta"
- "grande frota"
- "indicacao"
- "retornar depois"

**Criterios de Aceite:**
- [ ] Campo de tags no modal de detalhes (tab Dados)
- [ ] Autocomplete com tags existentes
- [ ] Tags visiveis no card do lead no pipeline
- [ ] Filtro por tag na tela de leads
- [ ] Acao em lote "Tagear" funcional

---

## 6. Requisitos Nao-Funcionais

| ID | Categoria | Requisito | Metrica |
|----|-----------|-----------|---------|
| RNF-1 | Performance | Dashboard carrega em < 2s com 5K leads | Lighthouse |
| RNF-2 | Performance | Lista de leads renderiza 100 items em < 500ms | Chrome DevTools |
| RNF-3 | Performance | Filtros aplicados em < 200ms | UX benchmark |
| RNF-4 | UX | Score e status visiveis sem abrir modal | Teste visual |
| RNF-5 | UX | Acoes urgentes visiveis sem scroll no dashboard | Layout test |
| RNF-6 | Responsividade | Funciona em 1280x720 ate 1920x1080 | Teste manual |
| RNF-7 | Dados | Score recalculado em < 1s apos edicao | API benchmark |
| RNF-8 | Dados | Atividade atualiza a cada 30s (polling) | Network tab |
| RNF-9 | Acessibilidade | Contraste WCAG AA em todos os badges de cor | axe-core |

---

## 7. Dependencias Tecnicas

### 7.1 Mudancas de Schema (Backend)

```sql
-- Novo campo: status do funil
ALTER TABLE leads ADD COLUMN funnel_status VARCHAR(20) DEFAULT 'novo';
-- Enum: novo, contactado, respondeu, interessado, convertido, perdido

-- Novo campo: motivo de perda
ALTER TABLE leads ADD COLUMN loss_reason VARCHAR(50);

-- Novo campo: score calculado
ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0;

-- Novo campo: proxima acao
ALTER TABLE leads ADD COLUMN next_action_date TIMESTAMP;
ALTER TABLE leads ADD COLUMN next_action_description TEXT;

-- Nova tabela: tags
CREATE TABLE lead_tags (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nova tabela: notas
CREATE TABLE lead_notes (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  content TEXT NOT NULL,
  author VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nova tabela: historico de interacoes
CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  type VARCHAR(30) NOT NULL, -- msg_sent, msg_received, status_change, note, scheduled
  content TEXT,
  metadata JSONB,
  author VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nova tabela: agendamentos de scraper
CREATE TABLE scraper_schedules (
  id UUID PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  city VARCHAR(100),
  keywords TEXT[], -- array de keywords
  quantity INTEGER DEFAULT 50,
  frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  day_of_week INTEGER, -- 0-6 para weekly
  execution_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nova tabela: atividade unificada
CREATE TABLE activity_log (
  id UUID PRIMARY KEY,
  type VARCHAR(30) NOT NULL, -- scraper, msg_sent, msg_received, status_change, campaign
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 7.2 Novos Endpoints API (FastAPI)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | /api/dashboard/kpis | KPIs expandidos (6 metricas) |
| GET | /api/dashboard/funnel-summary | Contagem por estagio do funil |
| GET | /api/dashboard/urgent-actions | Acoes urgentes (respostas, follow-ups) |
| GET | /api/dashboard/weekly-performance | Metricas de 7 dias |
| GET | /api/activity | Timeline de atividade unificada |
| PATCH | /api/leads/{id}/status | Atualizar status do funil |
| PATCH | /api/leads/{id}/score | Recalcular score |
| POST | /api/leads/{id}/notes | Adicionar nota |
| GET | /api/leads/{id}/notes | Listar notas |
| GET | /api/leads/{id}/interactions | Historico de interacoes |
| POST | /api/leads/{id}/tags | Adicionar tag |
| DELETE | /api/leads/{id}/tags/{tag} | Remover tag |
| POST | /api/leads/batch/tag | Tagear em lote |
| POST | /api/leads/batch/status | Alterar status em lote |
| POST | /api/leads/batch/campaign | Adicionar a campanha em lote |
| POST | /api/scraper/schedules | Criar agendamento |
| GET | /api/scraper/schedules | Listar agendamentos |
| PATCH | /api/scraper/schedules/{id} | Atualizar agendamento |
| DELETE | /api/scraper/schedules/{id} | Remover agendamento |
| GET | /api/scraper/coverage | Mapa de cobertura |
| GET | /api/scraper/suggestions | Sugestoes de keywords/cidades |

### 7.3 Dependencias Frontend

| Componente | Biblioteca | Uso |
|-----------|------------|-----|
| Grafico sparkline | Chart.js (ja existe) | Performance semanal |
| Chips/Tags | Componente custom ou Headless UI | Keywords e tags |
| Tabs | Headless UI ou Radix | Modal redesenhado |
| Checkbox em lote | React state | Selecao multipla |
| Timeline | Componente custom | Historico de interacoes |
| Slider range | Headless UI ou Radix | Filtro de score |

---

## 8. Priorizacao (MoSCoW)

### Must Have (P0) — MVP desta evolucao
| ID | Feature | Tela | Esforco |
|----|---------|------|---------|
| RF-D1 | KPIs expandidos (6 cards) | Dashboard | P |
| RF-D2 | Mini-funil visual | Dashboard | M |
| RF-D3 | Acoes urgentes | Dashboard | M |
| RF-S1 | Keywords customizaveis | Scraper | P |
| RF-S2 | Feedback inteligente | Scraper | P |
| RF-S3 | Pipeline transparente | Scraper | P |
| RF-L1 | Score dinamico | Leads | M |
| RF-L2 | Status do funil | Leads | M |
| RF-L3 | Filtros expandidos | Leads | M |
| RF-L4 | Acoes em lote | Leads | M |

### Should Have (P1)
| ID | Feature | Tela | Esforco |
|----|---------|------|---------|
| RF-D4 | Performance semanal | Dashboard | M |
| RF-D5 | Atividade unificada | Dashboard | M |
| RF-S4 | Agendamento de coletas | Scraper | G |
| RF-S6 | Opcoes avancadas | Scraper | P |
| RF-L5 | Cards enriquecidos | Leads | M |
| RF-L6 | Sidebar insights | Leads | G |
| RF-L7 | Modal com tabs | Leads | G |

### Could Have (P2)
| ID | Feature | Tela | Esforco |
|----|---------|------|---------|
| RF-D6 | Acoes rapidas nos leads recentes | Dashboard | P |
| RF-S5 | Mapa de cobertura | Scraper | M |
| RF-L8 | Tags customizaveis | Leads | M |

**Legenda esforco:** P = Pequeno (1-2 dias), M = Medio (3-5 dias), G = Grande (5-8 dias)

---

## 9. Estimativa de Implementacao

### Wave 1 — Must Have (P0)
**Duracao estimada:** 2-3 semanas
**Epics:**
1. Epic: Dashboard v2 (RF-D1, RF-D2, RF-D3)
2. Epic: Scraper v2 (RF-S1, RF-S2, RF-S3)
3. Epic: Leads v2 — Core (RF-L1, RF-L2, RF-L3, RF-L4)

### Wave 2 — Should Have (P1)
**Duracao estimada:** 2-3 semanas
**Epics:**
4. Epic: Dashboard v2 — Analytics (RF-D4, RF-D5)
5. Epic: Scraper v2 — Automacao (RF-S4, RF-S6)
6. Epic: Leads v2 — UX (RF-L5, RF-L6, RF-L7)

### Wave 3 — Could Have (P2)
**Duracao estimada:** 1 semana
**Epics:**
7. Epic: Polish (RF-D6, RF-S5, RF-L8)

**Total estimado:** 5-7 semanas

---

## 10. Riscos & Mitigacoes

| Risco | Impacto | Probabilidade | Mitigacao |
|-------|---------|---------------|-----------|
| Score dinamico requer recalculo de todos os leads existentes | Medio | Alta | Migration script que recalcula em batch |
| Agendamento de scraper requer Celery/worker persistente | Alto | Media | Iniciar com cron simples, Celery na Wave 2 |
| Performance com muitos filtros combinados | Medio | Media | Indices no banco + paginacao server-side |
| Complexidade do modal com 4 tabs | Baixo | Media | Implementar tab por tab, incremental |
| Atividade unificada requer log de todos os eventos | Medio | Alta | Criar tabela activity_log e inserir events progressivamente |

---

## 11. Glossario

| Termo | Definicao |
|-------|-----------|
| **Lead** | Contato de potencial cliente de transporte escolar |
| **Score** | Pontuacao 0-100 baseada na completude dos dados do lead |
| **Funil** | Ciclo de vida do lead: Novo > Contactado > Respondeu > Interessado > Convertido > Perdido |
| **SDR** | Sales Development Representative — pessoa que faz a prospecao ativa |
| **Cadencia** | Sequencia de mensagens com intervalos programados |
| **Pipeline** | Visualizacao do fluxo de leads por estagio |
| **Scraper** | Ferramenta que coleta dados automaticamente de fontes publicas |
| **OSINT** | Open Source Intelligence — inteligencia a partir de dados publicos |

---

## 12. Aprovacoes

| Papel | Nome | Status | Data |
|-------|------|--------|------|
| PM | Morgan (@pm) | Redigido | 2026-02-28 |
| Analyst | Atlas (@analyst) | Analise fornecida | 2026-02-28 |
| Founder | Flavio G. | Pendente | — |
| Architect | Aria (@architect) | Pendente | — |

---

**Versao:** 2.0.0
**Proximo passo:** Aprovacao do Founder → Criacao de Epics (@pm) → Stories (@sm)

— Morgan, planejando o futuro
