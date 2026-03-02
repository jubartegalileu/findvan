# Epic 24 — SDR & Funil de Vendas: Workflow Linear

**Brief:** docs/brief-sdr-funil.md (v2.0 — Architect-Reviewed)
**Status:** Done
**Prioridade:** P0 (Foundation — habilita persistência de dados SDR/Pipeline)
**Estimativa:** 1.5-2 sprints (4 stories)
**Owner:** @pm (Morgan)

---

## Epic Goal

Reestruturar o fluxo de leads do FindVan criando backend real (API + banco) e duas novas abas dedicadas (SDR e Funil de Vendas), separando responsabilidades hoje concentradas em memória no frontend. Cada aba terá propósito único: Leads (quem são), SDR (o que fazer), Funil (como está indo).

## Epic Description

### Existing System Context

- **Funcionalidade atual:** Aba Leads (Leads.jsx) gerencia dados cadastrais, funil, cadência e notas — tudo em memória no frontend, sem persistência
- **Technology stack:** React 18 + TailwindCSS (frontend), Node.js + Express (backend), PostgreSQL (banco)
- **Integration points:** Backend só tem `/api/whatsapp/*` e `/health`. Não existe `/api/leads`, `/api/dashboard/*`, nem tabelas de funil/SDR. Dashboard.jsx chama endpoints inexistentes.

### Enhancement Details

- **O que muda:** Criar tabelas `sdr_activities` e `pipeline`, API REST completa (`/api/leads`, `/api/sdr/*`, `/api/pipeline/*`), duas novas abas (SDR com fila do dia, Funil com kanban), e refatorar Leads.jsx e Dashboard.jsx para consumir dados reais
- **Como integra:** Trigger no banco auto-cria registros em `pipeline` e `sdr_activities` quando lead é inserido. Frontend migra de estado em memória para APIs reais.
- **Success criteria:** Dados de funil e SDR persistidos no banco; vendedor trabalha fila do dia na aba SDR; gestor visualiza pipeline em kanban na aba Funil; zero regressão nas abas existentes

---

## Stories

### Story 24.1 — Backend Foundation: API de Leads + Tabelas SDR/Pipeline

**Descrição:** Criar a migration SQL com tabelas `sdr_activities` e `pipeline`, trigger de auto-criação, função genérica `update_timestamp()`, CHECK constraints. Criar API REST `/api/leads` (CRUD), `/api/sdr/*` (queue, action, notes, stats), `/api/pipeline/*` (list, summary, move, history). Criar routes, services e conectar ao Express.

**Acceptance Criteria:**
- [ ] Migration 004-create-sdr-pipeline.sql executada sem erros
- [ ] Trigger `auto_create_pipeline_and_sdr()` cria registros automaticamente no INSERT de leads
- [ ] CHECK constraints validam `funnel_status` e `prospect_status`
- [ ] `GET /api/leads` retorna lista de leads com paginação
- [ ] `POST /api/leads` cria lead e auto-cria pipeline + sdr_activities
- [ ] `GET /api/sdr/queue` retorna fila ordenada por prioridade (cadência vencida primeiro)
- [ ] `PATCH /api/sdr/:leadId/action` registra ação e avança cadência
- [ ] `GET /api/pipeline` retorna leads agrupados por funnel_status
- [ ] `GET /api/pipeline/summary` retorna métricas agregadas por stage
- [ ] `PATCH /api/pipeline/:leadId/move` valida funnel transitions antes de mover
- [ ] Testes unitários para services e integration tests para routes
- [ ] Lint e typecheck passam

**Executor Assignment:**

```yaml
executor: "@data-engineer"
quality_gate: "@architect"
quality_gate_tools: [schema_validation, migration_review, api_contract_validation]
```

**Quality Gates:**
- Pre-Commit: Schema validation, constraint verification, trigger test
- Pre-PR: API contract validation, funnel transition logic review, SQL review

**Estimativa:** M (médio)

---

### Story 24.2 — Aba SDR: Mesa de Trabalho do Vendedor

**Descrição:** Criar página SDR.jsx com fila do dia (leads com cadência vencida/hoje), cards de lead com quick actions (WhatsApp, telefone, anotar, marcar feito), filtros (cadência, score, cidade), contador de performance. Adicionar rota `/sdr` no App.jsx e item no sidebar (Layout.jsx). Consumir `/api/sdr/*`.

**Acceptance Criteria:**
- [ ] Aba SDR acessível no sidebar entre Leads e Funil
- [ ] Fila do dia mostra leads ordenados: cadência vencida > hoje > planejada, depois por score
- [ ] Card exibe: nome, empresa, telefone, score, último contato, próxima ação (sem abrir modal)
- [ ] Quick action WhatsApp abre conversa via integração existente
- [ ] Quick action anotar permite adicionar nota inline (persiste via `/api/sdr/:leadId/notes`)
- [ ] Quick action "marcar como feito" avança cadência (persiste via `/api/sdr/:leadId/action`)
- [ ] Filtros funcionam: por status de cadência, por score range, por cidade
- [ ] Contador exibe "X contatos feitos hoje / Y pendentes"
- [ ] Testes unitários para componentes
- [ ] Lint e typecheck passam

**Executor Assignment:**

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [code_review, pattern_validation, ux_consistency]
```

**Quality Gates:**
- Pre-Commit: Component structure review, API integration validation
- Pre-PR: UX consistency with existing tabs, performance check

**Estimativa:** M (médio)
**Blocked by:** Story 24.1

---

### Story 24.3 — Aba Funil de Vendas: Pipeline Visual (Kanban)

**Descrição:** Criar página Funnel.jsx com kanban board (6 colunas: Novo, Contactado, Respondeu, Interessado, Convertido, Perdido), drag-and-drop via @dnd-kit/core, métricas por stage, barra de resumo, filtro por período. Adicionar rota `/funil` e item no sidebar. Consumir `/api/pipeline/*`.

**Acceptance Criteria:**
- [ ] Aba Funil acessível no sidebar entre SDR e WhatsApp
- [ ] Kanban board com 6 colunas correspondendo aos funnel_status
- [ ] Cards exibem: nome, empresa, score, dias no stage atual
- [ ] Drag-and-drop move lead entre stages (respeita `funnelTransitions` — validação server-side)
- [ ] Ao mover para "Perdido", solicita `loss_reason` (obrigatório)
- [ ] Métricas por stage: quantidade, % do total, taxa de conversão para próximo stage
- [ ] Barra de resumo: total no pipeline, taxa de conversão geral, tempo médio total
- [ ] Filtro por período: últimos 7/30/90 dias
- [ ] Renderiza suavemente com até 500 leads
- [ ] Dependência @dnd-kit/core adicionada ao package.json
- [ ] Testes unitários para componentes
- [ ] Lint e typecheck passam

**Executor Assignment:**

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [code_review, pattern_validation, performance_check]
```

**Quality Gates:**
- Pre-Commit: Component structure, drag-and-drop logic review
- Pre-PR: Performance validation (500 cards), UX consistency, transition validation

**Estimativa:** L (grande)
**Blocked by:** Story 24.1

---

### Story 24.4 — Refatorar Leads.jsx + Dashboard com Endpoints Reais

**Descrição:** Remover de Leads.jsx toda lógica de funnel_status, prospect_status, next_action_date, prospect_notes, loss_reason, cadência e SLA (hoje em memória). Leads.jsx passa a consumir apenas `/api/leads` para dados cadastrais + score + tags. Dashboard.jsx passa a consumir `/api/pipeline/summary` e `/api/sdr/stats` para KPIs reais. Criar/adaptar endpoints de dashboard no backend.

**Acceptance Criteria:**
- [ ] Leads.jsx não contém mais lógica de funnel, cadência ou prospect_notes
- [ ] Leads.jsx consome `/api/leads` para listar, filtrar e editar leads
- [ ] Score e tags continuam funcionando na aba Leads
- [ ] Dashboard.jsx consome endpoints reais (`/api/pipeline/summary`, `/api/sdr/stats`)
- [ ] KPIs do Dashboard refletem dados persistidos no banco
- [ ] Funnel summary no Dashboard exibe dados reais de pipeline
- [ ] Nenhuma funcionalidade foi perdida — tudo migrou para SDR ou Funil
- [ ] Testes de regressão para Leads e Dashboard
- [ ] Lint e typecheck passam

**Executor Assignment:**

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [regression_test, code_review, integration_validation]
```

**Quality Gates:**
- Pre-Commit: Regression check on Leads and Dashboard
- Pre-PR: Full integration validation, verify no orphaned code

**Estimativa:** M (médio)
**Blocked by:** Story 24.1, 24.2, 24.3

---

## Execution Order

```
Story 24.1 (backend foundation)
    ├──→ Story 24.2 (SDR tab) ──┐
    └──→ Story 24.3 (Funnel tab) ──┤
                                    └──→ Story 24.4 (refactor Leads + Dashboard)
```

- **24.1** é prerequisito de todas as outras
- **24.2** e **24.3** podem ser desenvolvidas em paralelo após 24.1
- **24.4** só inicia quando SDR e Funil estão funcionais

## Compatibility Requirements

- [x] Existing WhatsApp API (`/api/whatsapp/*`) permanece inalterada
- [x] Database schema de leads permanece inalterado (adição de tabelas, não modificação)
- [x] UI das abas existentes (Scraper, WhatsApp, Campanhas, Configurações) não é afetada
- [x] Mensagens e campanhas existentes continuam funcionando

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Leads.jsx refactor quebra funcionalidade | HIGH | MEDIUM | Story 24.4 é última; testes de regressão extensivos |
| @dnd-kit performance com muitos cards | MEDIUM | LOW | Virtualização de lista se necessário; escopo de 500 cards |
| Dashboard endpoints inexistentes causam erros | LOW | HIGH (já acontece) | Story 24.1 cria endpoints reais; 24.4 conecta Dashboard |

**Rollback Plan:** Cada story é independente no backend. Se necessário, reverter migration e remover rotas. Frontend pode voltar ao estado anterior (lógica em memória) revertendo commits.

## Quality Assurance Strategy

- **CodeRabbit Validation:** Todas as stories incluem pre-commit reviews
- **Schema stories (24.1):** @data-engineer implementa, @architect valida schema, constraints e API contracts
- **Frontend stories (24.2, 24.3):** @dev implementa, @architect valida patterns e performance
- **Refactor story (24.4):** @dev implementa, @qa valida regressão completa
- **Regression Prevention:** Story 24.4 inclui testes de regressão para todas as abas afetadas

## Open Questions (Require PM Decision)

1. O Dashboard deve ter um mini-funil visual ou continua com KPIs numéricos? → **Decisão: manter KPIs numéricos no MVP, mini-funil visual em Phase 2**
2. Campanhas disparáveis direto do SDR? → **Decisão: out of scope para MVP, SDR só tem WhatsApp direto**
3. Loss reasons obrigatórios ao mover para "Perdido"? → **Decisão: SIM, obrigatório (incluído no AC da Story 24.3)**
4. Stage history grava quem moveu? → **Decisão: SIM, gravar `moved_by` no stage_history JSONB (prepara multi-vendedor)**

## Definition of Done

- [x] Todas as 4 stories completadas com acceptance criteria met
- [x] Tabelas `sdr_activities` e `pipeline` criadas e funcionais
- [x] API de leads, SDR e pipeline operacional
- [x] Aba SDR funcional com fila do dia e quick actions
- [x] Aba Funil funcional com kanban e métricas
- [x] Leads.jsx e Dashboard.jsx consumindo dados reais do backend
- [x] Zero regressão nas abas existentes (Scraper, WhatsApp, Campanhas, Configurações)
- [x] Todos os testes passando, lint e typecheck OK

## Closure Note (2026-03-02)

- Epic 24 foi concluído ao longo das waves subsequentes (25-28), com fechamento técnico no stack atual (`packages/backend/app/*` + `packages/dashboard/src/*`).
- Gate final de fechamento:
  - `npm run test:api:sdr-funil` -> PASS (67)
  - `npm run test:regression:sdr-funil` -> PASS (5 files / 12 tests)

---

## SM Handoff

"Please develop detailed user stories for Epic 24. Key considerations:

- This is an enhancement to an existing system running React 18 + TailwindCSS + Node.js/Express + PostgreSQL
- Integration points: trigger no banco (lead INSERT → auto-create pipeline + sdr_activities), API REST, sidebar navigation
- Existing patterns to follow: migration SQL pattern (001/002/003), Express routes pattern (whatsapp.js), React page pattern (Leads.jsx, Dashboard.jsx)
- Critical compatibility: WhatsApp API untouched, leads table schema untouched, existing UI tabs unaffected
- Story 24.1 is prerequisite for all others; 24.2 and 24.3 can parallelize; 24.4 is last
- Each story must include verification that existing functionality remains intact
- Schema validado pelo @architect (docs/brief-sdr-funil.md v2.0) — usar exatamente o SQL proposto

The epic should maintain system integrity while delivering persistent SDR/Pipeline operations with dedicated UI tabs."

---

*— Morgan, planejando o futuro 📊*
