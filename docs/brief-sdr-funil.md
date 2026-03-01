# Project Brief: SDR & Funil de Vendas — Workflow Linear (Opção 3)

**Data:** 2026-03-01
**Autor:** Atlas (@analyst) | **Revisão Arquitetural:** Aria (@architect)
**Versão:** 2.0
**Status:** Architect-Reviewed — Pendente review @pm

---

## Executive Summary

Reestruturação do fluxo de leads do FindVan, separando responsabilidades hoje concentradas na aba Leads em 3 abas com propósito único: **Leads** (banco de dados), **SDR** (mesa de trabalho do vendedor) e **Funil de Vendas** (gestão visual do pipeline). O objetivo é eliminar ambiguidade de uso, preparar o app para multi-vendedor e criar uma base escalável para features avançadas de vendas.

---

## Problem Statement

### Estado Atual

A aba Leads acumula 3 responsabilidades distintas:

1. **Gestão de dados** — cadastro, score, dedup, validação, tags
2. **Operação de vendas** — cadência, next_action_date, ações de contato, notas
3. **Gestão de pipeline** — funnel_status (novo→convertido), loss_reason, métricas

Isso gera:
- **Sobrecarga cognitiva** — vendedor precisa filtrar mentalmente o que é relevante para sua tarefa
- **Ações sem contexto** — atualizar status de funil e agendar follow-up acontecem na mesma tela, sem guia de workflow
- **Impossibilidade de escalar** — não tem como atribuir leads a vendedores diferentes
- **Métricas misturadas** — Dashboard puxa tudo de leads, sem distinção entre dados cadastrais e dados de pipeline

### Architect Note: Estado Real do Banco

> **IMPORTANTE:** Os campos `funnel_status`, `prospect_status`, `next_action_date`, `prospect_notes`, `loss_reason` e `score` **NÃO existem no banco de dados**. Eles existem apenas no frontend (Leads.jsx), aplicados em memória com valores default. A tabela `leads` no PostgreSQL contém apenas dados cadastrais + `is_valid`, `is_duplicate`, `contacted_at`.
>
> Além disso, **não existe rota `/api/leads/`** no backend — apenas `/api/whatsapp/*` e `/health` estão implementados. O Dashboard consome endpoints (`/api/dashboard/kpis`, `/api/dashboard/funnel-summary`) que também não existem no backend.
>
> **Impacto:** Não há migration de dados necessária. As novas tabelas são criação pura, e a API de leads precisa ser criada do zero.

### Campos no frontend (Leads.jsx) que serão redistribuídos

| Campo (frontend-only) | Responsabilidade Real | Aba Destino |
|------------------------|----------------------|-------------|
| `funnel_status` | Pipeline | Funil |
| `loss_reason` | Pipeline | Funil |
| `prospect_status` | Qualificação SDR | SDR |
| `next_action_date` | Cadência SDR | SDR |
| `next_action_description` | Cadência SDR | SDR |
| `prospect_notes` | Operação SDR | SDR |
| `contacted_at` | Tracking SDR | SDR (já existe no banco) |

---

## Proposed Solution

### Modelo: Workflow Linear com Separação de Responsabilidades

```
Scraper ──→ LEADS ──→ SDR ──→ FUNIL DE VENDAS
             (quem)    (o que fazer)  (como está indo)
               ↕            ↕              ↕
           WhatsApp ←── Campanhas      Dashboard
```

### Princípio de Design

**Cada aba responde a UMA pergunta:**

| Aba | Pergunta | Ação Principal |
|-----|----------|---------------|
| **Leads** | "Quem são meus contatos?" | Consultar, filtrar, importar, validar |
| **SDR** | "O que eu preciso fazer agora?" | Executar cadência, ligar, enviar WhatsApp, anotar |
| **Funil** | "Como está meu pipeline?" | Visualizar progresso, analisar conversão, prever receita |

### Diferenciadores

- **Leads fica leve** — apenas dados cadastrais + score + tags
- **SDR é operacional** — fila do dia, cadência guiada, quick actions
- **Funil é analítico** — kanban visual, métricas de conversão por stage, tempo médio

---

## Target Users

### Primary: Operador SDR / Vendedor

- **Perfil:** Pessoa que prospecta escolas de transporte escolar via WhatsApp e telefone
- **Workflow atual:** Abre Leads → filtra por status → seleciona um → envia mensagem → anota → volta para lista
- **Dor:** Não tem visão de "minha fila do dia", precisa montar mentalmente a prioridade
- **Meta:** Maximizar contatos úteis por dia com mínimo de cliques

### Secondary: Gestor / Dono do Negócio

- **Perfil:** Acompanha performance geral, conversão do funil, eficiência das campanhas
- **Workflow atual:** Abre Dashboard → olha KPIs → abre Leads → filtra por funnel_status para entender pipeline
- **Dor:** Não tem visão de funil dedicada, métricas de conversão são limitadas
- **Meta:** Entender saúde do pipeline e projetar receita

---

## Goals & Success Metrics

### Business Objectives

- Aumentar taxa de contatos/dia por vendedor em 30% (reduzindo cliques e contexto switching)
- Reduzir tempo médio por stage do funil (visibilidade = ação mais rápida)
- Preparar base técnica para multi-vendedor (Q3 2026)

### User Success Metrics

- SDR: vendedor consegue ver e executar toda sua fila do dia sem sair da aba SDR
- Funil: gestor consegue responder "quantos leads tenho em cada etapa e qual a taxa de conversão?" em 1 tela

### KPIs

- **Contatos/dia por vendedor:** baseline atual → +30% após SDR
- **Tempo médio no stage "contactado":** reduzir 20% (cadência guiada evita esquecimento)
- **Taxa de conversão novo→convertido:** visibilidade no funil permite otimização
- **Leads "esquecidos" (sem ação >7 dias):** reduzir 50% com alertas no SDR

---

## MVP Scope

### Core Features (Must Have)

#### Backend Foundation (API de Leads + Novas Tabelas)
- **Criar API `/api/leads`** — CRUD de leads que hoje não existe no backend
- **Nova tabela `sdr_activities`** — dados operacionais do vendedor (ver schema abaixo)
- **Nova tabela `pipeline`** — dados de funil/pipeline (ver schema abaixo)
- **Trigger `auto_create_pipeline_and_sdr()`** — auto-cria registros em pipeline e sdr_activities quando lead é inserido, garantindo integridade referencial
- **Migration SQL** (004-create-sdr-pipeline.sql) — criação pura, sem migration de dados existentes

#### Aba SDR — Mesa de Trabalho
- **Fila do dia:** lista de leads com cadência vencida ou para hoje, ordenada por prioridade (score + SLA)
- **Card de lead:** nome, empresa, telefone, score, último contato, próxima ação — tudo visível sem abrir modal
- **Quick actions no card:** botão WhatsApp (abre conversa), botão telefone (click-to-call), botão anotar (inline), botão "marcar como feito" (avança cadência)
- **Filtros:** por status de cadência (vencida, hoje, planejada), por score range, por cidade
- **Contador de performance:** "X contatos feitos hoje / Y pendentes"

#### Aba Funil de Vendas — Pipeline Visual
- **Kanban board:** colunas = stages do funil (Novo, Contactado, Respondeu, Interessado, Convertido, Perdido)
- **Cards nos stages:** nome, empresa, score, dias no stage atual
- **Drag-and-drop:** mover lead entre stages (respeitando `funnelTransitions` já definidas)
- **Métricas por stage:** quantidade, % do total, taxa de conversão para próximo stage
- **Barra de resumo:** total no pipeline, taxa de conversão geral, tempo médio total
- **Filtro por período:** ver funil dos últimos 7/30/90 dias

#### Ajustes nas Abas Existentes
- **Leads.jsx:** remover lógica de funnel_status, cadência e prospect_notes (mover para consumir das novas APIs)
- **Dashboard.jsx:** criar endpoints reais no backend (`/api/dashboard/kpis`, `/api/pipeline/summary`) para substituir os que são chamados mas não existem
- **WhatsApp:** manter integração — ação de envio pode ser disparada tanto de SDR quanto de WhatsApp

### Out of Scope for MVP

- Multi-vendedor (assignment por usuário) — Phase 2
- Playbooks/scripts de ligação — Phase 2
- Automação de cadência (auto-avançar steps) — Phase 2
- Forecasting de receita — Phase 2
- Integração com CRM externo — Phase 3
- App mobile para SDR em campo — Phase 3

### MVP Success Criteria

- Vendedor consegue trabalhar uma fila de 30 leads/dia usando apenas a aba SDR
- Gestor consegue ver funil completo em kanban com métricas de conversão por stage
- Todos os dados de funil e SDR persistidos no banco (não mais em memória no frontend)
- Aba Leads funciona apenas com dados cadastrais
- Dashboard consome dados reais do backend

---

## Post-MVP Vision

### Phase 2 — Multi-Vendedor & Automação

- Assignment de leads por vendedor (`assigned_to` em `sdr_activities`)
- Dashboard por vendedor (filtro no SDR e Funil)
- Cadência automatizada: templates de sequência (Dia 1: WhatsApp, Dia 3: Ligação, Dia 7: Follow-up)
- Playbooks de ligação com scripts sugeridos por stage
- Forecasting básico no Funil (receita projetada por probabilidade do stage)

### Phase 3 — Inteligência & Escala

- Score dinâmico baseado em comportamento (abriu mensagem, respondeu, clicou link)
- A/B testing de mensagens por stage do funil
- Integração com CRM externo (Pipedrive, HubSpot)
- Relatórios exportáveis (PDF/Excel) de performance de funil
- App mobile para SDR em campo

### Long-term Vision

FindVan se torna a plataforma completa de prospecção e vendas para o nicho de transporte escolar, com ciclo fechado: prospecção (Scraper) → qualificação (Leads) → operação de vendas (SDR) → gestão de pipeline (Funil) → comunicação (WhatsApp/Campanhas) → análise (Dashboard).

---

## Technical Considerations

### Platform Requirements

- **Target:** Desktop (Electron + React) — mesmo stack atual
- **Performance:** Kanban deve renderizar suavemente com até 500 leads no pipeline
- **Responsividade:** Não requerida para MVP (desktop-first)

### Technology Preferences

- **Frontend:** React 18 + TailwindCSS (manter stack atual)
- **Backend:** Node.js + Express (manter stack atual)
- **Database:** PostgreSQL (novas tabelas + migration)
- **Kanban:** Biblioteca leve de drag-and-drop (@dnd-kit/core — recomendado por manutenção ativa, react-beautiful-dnd está deprecated)
- **State:** React hooks (manter padrão atual, sem Redux)

### Architecture Considerations

- **Repository:** Monorepo existente (`packages/backend`, `packages/dashboard`)
- **API (novos endpoints):**
  - `GET/POST /api/leads` — CRUD de leads (precisa ser criado)
  - `GET/PATCH /api/sdr/*` — Operações SDR
  - `GET/PATCH /api/pipeline/*` — Operações de pipeline
- **Migration:** SQL migration incremental (004-create-sdr-pipeline.sql) — criação pura
- **Integridade:** Trigger no banco garante que todo lead tem registro em pipeline e sdr_activities

### Schema Validado pelo @architect

```sql
-- ============================================================
-- Migration 004: Create SDR Activities and Pipeline tables
-- Description: Backend foundation for SDR and Funnel tabs
-- ============================================================

-- Generic timestamp trigger (reusable)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Tabela: sdr_activities (Mesa de trabalho do vendedor)
-- ============================================================
CREATE TABLE IF NOT EXISTS sdr_activities (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to VARCHAR(100) DEFAULT 'default',
  prospect_status VARCHAR(30) DEFAULT 'nao_contatado',
  next_action_date TIMESTAMP,
  next_action_description TEXT,
  cadence_step INTEGER DEFAULT 0,
  last_contact_at TIMESTAMP,
  contact_count INTEGER DEFAULT 0,
  notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_sdr_lead ON sdr_activities(lead_id);
CREATE INDEX idx_sdr_next_action ON sdr_activities(next_action_date)
  WHERE next_action_date IS NOT NULL;
CREATE INDEX idx_sdr_assigned ON sdr_activities(assigned_to);
CREATE INDEX idx_sdr_prospect_status ON sdr_activities(prospect_status);

-- Trigger updated_at
CREATE TRIGGER trigger_sdr_updated_at
  BEFORE UPDATE ON sdr_activities
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- Tabela: pipeline (Funil de vendas)
-- ============================================================
CREATE TABLE IF NOT EXISTS pipeline (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  funnel_status VARCHAR(30) NOT NULL DEFAULT 'novo',
  entered_stage_at TIMESTAMP NOT NULL DEFAULT NOW(),
  loss_reason VARCHAR(50),
  loss_reason_detail TEXT,
  stage_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_pipeline_lead ON pipeline(lead_id);
CREATE INDEX idx_pipeline_status ON pipeline(funnel_status);
CREATE INDEX idx_pipeline_entered ON pipeline(entered_stage_at);
CREATE INDEX idx_pipeline_status_entered ON pipeline(funnel_status, entered_stage_at);

-- Trigger updated_at
CREATE TRIGGER trigger_pipeline_updated_at
  BEFORE UPDATE ON pipeline
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- Trigger: Auto-create pipeline + sdr_activities on lead insert
-- Garante integridade referencial sem depender da aplicação
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_pipeline_and_sdr()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pipeline (lead_id) VALUES (NEW.id);
  INSERT INTO sdr_activities (lead_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lead_created
  AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION auto_create_pipeline_and_sdr();

-- ============================================================
-- Validação de funnel transitions (constraint check)
-- ============================================================
ALTER TABLE pipeline ADD CONSTRAINT valid_funnel_status
  CHECK (funnel_status IN ('novo', 'contactado', 'respondeu', 'interessado', 'convertido', 'perdido'));

ALTER TABLE sdr_activities ADD CONSTRAINT valid_prospect_status
  CHECK (prospect_status IN ('nao_contatado', 'contatado', 'cliente', 'fora_do_ramo'));

-- Comments
COMMENT ON TABLE sdr_activities IS 'SDR work queue: cadence tracking, notes, and daily actions per lead';
COMMENT ON TABLE pipeline IS 'Sales pipeline: funnel stage tracking with history and loss reasons';
COMMENT ON FUNCTION auto_create_pipeline_and_sdr() IS 'Auto-creates pipeline and sdr_activities records when a new lead is inserted';
```

### Architect Notes sobre o Schema

| Correção | Motivo |
|----------|--------|
| `lead_id BIGINT` (não INTEGER) | `leads.id` é `BIGSERIAL` = BIGINT |
| `prospect_status` adicionado em `sdr_activities` | Existia no frontend, faltava no schema original |
| `loss_reason_detail TEXT` adicionado em `pipeline` | Frontend tem lógica `outro: texto livre` |
| `funnel_status NOT NULL` | Sempre tem valor (default 'novo') |
| Index parcial em `next_action_date WHERE NOT NULL` | Otimiza queries da fila SDR |
| Index composto `(funnel_status, entered_stage_at)` | Queries do Dashboard por período |
| `CHECK` constraints nos status | Previne valores inválidos no banco |
| Trigger `auto_create_pipeline_and_sdr()` | Integridade referencial sem depender da app |
| Função genérica `update_timestamp()` | Reutilizável para futuras tabelas |

### API Design (Architect-Validated)

```
# Leads (NOVO - precisa ser criado)
GET    /api/leads                  → Lista de leads (dados cadastrais + score)
GET    /api/leads/:id              → Lead individual com dados de SDR e pipeline (JOIN)
POST   /api/leads                  → Criar lead (trigger auto-cria pipeline + sdr)
PATCH  /api/leads/:id              → Atualizar dados cadastrais

# SDR
GET    /api/sdr/queue              → Fila do dia (leads com cadência vencida/hoje)
GET    /api/sdr/queue?filter=...   → Filtros (cidade, score, status)
PATCH  /api/sdr/:leadId/action     → Registrar ação (avança cadência)
PATCH  /api/sdr/:leadId/notes      → Adicionar nota
GET    /api/sdr/stats              → Performance do dia (contatos feitos/pendentes)

# Pipeline
GET    /api/pipeline               → Todos os leads agrupados por stage
GET    /api/pipeline/summary       → Métricas agregadas por stage
PATCH  /api/pipeline/:leadId/move  → Mover lead de stage (com validação de transitions)
GET    /api/pipeline/history       → Histórico de movimentações
```

---

## Constraints & Assumptions

### Constraints

- **Budget:** Solo dev + AI agents (sem equipe adicional)
- **Timeline:** 1.5-2 sprints para MVP (estimativa revisada — sem migration de dados)
- **Resources:** Stack existente, sem novas dependências externas pesadas
- **Technical:** Criação pura de tabelas, sem migration de dados legados

### Key Assumptions

- Volume atual de leads é <5.000
- Apenas 1 vendedor no MVP (campo `assigned_to` existe mas sem UI de assignment)
- Funnel transitions já definidas no frontend são suficientes para MVP
- Drag-and-drop no kanban não precisa de persistência otimista (pode esperar resposta da API)
- Backend de leads (`/api/leads`) será criado como parte deste epic

---

## Risks & Open Questions

### Key Risks

- **Refatoração do Leads.jsx:** arquivo grande com muita lógica in-memory que precisa migrar para APIs reais. **Mitigation:** refatorar incrementalmente, manter funcionalidade existente até nova aba estar pronta
- **Dashboard sem backend:** endpoints que o Dashboard chama não existem. **Mitigation:** criar endpoints reais como parte da Story 1
- **Complexidade do Kanban:** drag-and-drop pode ser custoso de implementar bem. **Mitigation:** usar @dnd-kit (mantido ativamente), escopo mínimo sem animações sofisticadas

### Open Questions

- O Dashboard deve ter um mini-funil visual ou continua com os KPIs numéricos atuais?
- A aba Campanhas deve poder ser disparada direto do SDR (quick action "adicionar à campanha")?
- Loss reasons devem ser obrigatórios ao mover para "Perdido" no kanban?
- Stage history deve gravar quem moveu (preparando para multi-vendedor)?

### Areas Needing Further Research

- Benchmarks de performance de @dnd-kit com 200+ cards no kanban
- Padrões de UX para SDR dashboards (referências: Pipedrive, HubSpot, Close.io)

---

## Appendices

### A. Brainstorming Summary

Sessão de brainstorming facilitada por @analyst (Atlas) avaliou 3 opções:

1. ~~Separação por responsabilidade~~ — Descartada
2. ~~Camadas adicionais~~ — Analisada em profundidade, descartada por limitação de escalabilidade
3. **Workflow linear (escolhida)** — Melhor robustez a longo prazo, base para multi-vendedor, separação clara de responsabilidades

### B. Architect Review Summary

Revisão arquitetural por @architect (Aria) identificou:

1. **Campos SDR/Funil não existem no banco** — apenas no frontend em memória
2. **API de leads não existe** — backend só tem rotas de WhatsApp
3. **Dashboard endpoints não existem** — frontend chama APIs que retornam erro
4. **Resultado:** escopo simplificado (~30% menor), sem migration de dados, criação pura

### C. Fluxo de Dados (Architect-Validated)

```
Scraper → Leads table (dados brutos, dedup)
              ↓ (INSERT trigger)
          Pipeline table (auto-cria com status "novo")
          SDR Activities table (auto-cria com cadência step 0)
              ↓
          SDR Tab → GET /api/sdr/queue (vendedor trabalha fila)
              ↓ (PATCH /api/sdr/:leadId/action)
          Pipeline table (status atualizado via /api/pipeline/:leadId/move)
          WhatsApp / Campanhas (mensagens disparadas)
              ↓
          Funil Tab → GET /api/pipeline (gestor visualiza kanban)
              ↓
          Dashboard → GET /api/pipeline/summary + /api/sdr/stats
```

---

## Next Steps

1. ~~**Review @architect**~~ — DONE (v2.0)
2. **Review @pm** — Alinhar com roadmap, criar epic
3. **Story 1:** API de leads + tabelas `sdr_activities` e `pipeline` + trigger + endpoints SDR/pipeline (backend)
4. **Story 2:** Aba SDR (frontend + integração `/api/sdr/*`)
5. **Story 3:** Aba Funil/Kanban (frontend + integração `/api/pipeline/*`)
6. **Story 4:** Refatorar Leads.jsx + adaptar Dashboard com endpoints reais

**Estimativa revisada: 4 stories, 1.5-2 sprints**

---

### PM Handoff

Este Project Brief fornece o contexto completo para o redesign de workflow do FindVan. @pm deve usá-lo como input para criar o PRD e decompor em epic/stories. As **Open Questions** listadas devem ser respondidas antes de iniciar implementação.

---

*— Atlas (@analyst) + Aria (@architect)*
