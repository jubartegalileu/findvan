# 📋 PRD — Módulos de Desenvolvimento Sequencial
## Aplicativo OSINT + SDR para Prospecção de Vans Escolares

**Versão:** 1.0.0-modular
**Data:** 2026-02-27
**Status:** Ready for Implementation
**Público:** Você + Sócio (Operadores)
**Abordagem:** Desenvolvimento modular sequencial (1→2→3→4, 100% testing entre módulos)

---

## 📊 Contexto Estratégico

### Mercado & Oportunidade

| Métrica | Valor |
|---------|-------|
| **TAM Brasil** | R$ 63M - R$ 109M/ano |
| **SAM Fase 1** | R$ 300K - R$ 1.2M/ano |
| **Leads/Mês** | 5K - 9K |
| **Ticket Médio** | R$ 50-80/mês |
| **Target** | 5 cidades, fase inicial |

**Produto:** SaaS Desktop para gestão de transporte escolar com:
- Coleta automática de leads (OSINT)
- CRM integrado
- Disparo WhatsApp por geolocalização
- Controle de pagamento

### Estratégia OSINT — 5 Fontes Validadas

| Rank | Fonte | Volume/Mês | Prioridade | Sprint |
|------|-------|-----------|-----------|--------|
| 1 | Google Maps | 2K-4K | CRÍTICA | 1 |
| 2 | Facebook Groups | 1K-2K | CRÍTICA | 2 |
| 3 | CNPJ Lookup | 1K-2K | CRÍTICA | 2 |
| 4 | OLX/Marketplace | 0.5K-1K | ALTA | 3 |
| 5 | LinkedIn | 0.5K-1K | ALTA | 3 |

**Total esperado:** 5K-9K leads/mês (validado através de pesquisa de mercado)

---

## 🏗️ Arquitetura Geral

### Tech Stack (Confirmado)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Electron)                      │
│  • React 18 + TypeScript                                    │
│  • TailwindCSS (UI)                                         │
│  • Chart.js (Data viz)                                      │
│  • Axios (HTTP)                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                         │
│  • Python 3.11                                              │
│  • SQLAlchemy (ORM)                                         │
│  • Pydantic (Validation)                                    │
│  • Celery (Task Queue)                                      │
│  • Alembic (Migrations)                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 DATABASE & CACHE                            │
│  • PostgreSQL 15 (Primary)                                  │
│  • Redis 7 (Cache/Queue)                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SCRAPER (Node.js 18)                           │
│  • Puppeteer (Browser automation)                           │
│  • Cheerio (HTML parsing)                                   │
│  • Got (HTTP client)                                        │
│  • Runs as background worker                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            EXTERNAL INTEGRATIONS                            │
│  • Google Maps API (lead sourcing)                          │
│  • Facebook API/Scraper (lead sourcing)                     │
│  • Twilio/WhatsApp Business API (messaging)                 │
│  • CNPJ Lookup APIs (company data)                          │
└─────────────────────────────────────────────────────────────┘

Deployment: Docker + Railway (cloud)
```

---

## 🎯 Módulo 1: SCRAPER
### Status: [ ] Not Started | Duração: 2 semanas (Sprint 1)

**Objetivo:** Capturar 100+ leads inicialmente de Google Maps com prova de conceito funcional.

### 1.1 Requisitos Funcionais

#### RF1.1 — Google Maps Scraper
- [ ] Scraper automatizado do Google Maps
- [ ] Busca por query: "transporte escolar [cidade]"
- [ ] Extração de dados: nome, telefone, email, endereço, URL
- [ ] Rate limiting (delay entre requisições, proxy rotation)
- [ ] Retry logic (falhas temporárias)
- [ ] Logging detalhado (o que foi coletado, erros)
- [ ] Agendamento básico (run diário às 8h)

**Saída esperada:** 100-200 leads únicos em 1 semana

#### RF1.2 — Validação de Dados
- [ ] Limpeza de duplicatas simples (mesmo telefone)
- [ ] Validação de formato: telefone (11 dígitos BR)
- [ ] Validação de endereço não-vazio
- [ ] Flag de "dados válidos" antes de salvar em BD

#### RF1.3 — Armazenamento Temporário
- [ ] Salvar leads capturados em arquivo JSON (antes de BD)
- [ ] Estrutura padrão: `{ name, phone, email, address, city, source, company_name, captured_at }`
- [ ] Backup local (./data/raw-leads/)

### 1.2 Requisitos Não-Funcionais

| RNF | Critério |
|-----|----------|
| **Performance** | Scraper captura 100 leads em <5 min |
| **Confiabilidade** | 95%+ taxa de sucesso na coleta |
| **Logging** | Logs estruturados (arquivo + console) |
| **Escalabilidade** | Código pronto para adicionar Facebook/CNPJ depois |
| **Testabilidade** | Unit tests para validação e parsing |

### 1.3 Acceptance Criteria

- [ ] Scraper Google Maps funcionando (manual CLI command)
- [ ] 100+ leads capturados e salvos em JSON
- [ ] Nenhum erro crítico em logs (warnings ok)
- [ ] Unit tests rodando (>80% coverage)
- [ ] Documentação: como rodar scraper manualmente

### 1.4 Dependências & Pré-requisitos

- Projeto Node.js inicializado
- Puppeteer + Cheerio instalados
- Pasta ./data/raw-leads/ criada
- Google Chrome/Chromium disponível

### 1.5 Decisões de Design

**Por quê Google Maps primeiro?**
- Maior volume de dados (2K-4K/mês)
- Menos restrições legais que Facebook
- Dados estruturados disponíveis

**Por quê JSON antes de BD?**
- Validação independente do módulo 2
- Fácil debugging e backup
- Desacoplamento entre scraper e DB

**Formato de dados padrão:**
```json
{
  "id": "gm_20260227_001",
  "source": "google_maps",
  "name": "Van Escolar ABC",
  "phone": "11987654321",
  "email": "contato@vanabc.com",
  "address": "Av. Paulista, 1000, São Paulo",
  "city": "São Paulo",
  "company_name": "ABC Transportes LTDA",
  "cnpj": null,
  "url": "https://maps.google.com/...",
  "captured_at": "2026-02-27T08:30:00Z",
  "is_valid": true,
  "is_duplicate": false
}
```

### 1.6 Critério de Conclusão (Definition of Done)

✅ Módulo 1 está **100% COMPLETO** quando:

1. ✓ Scraper CLI funciona: `npm run scraper:google-maps --city="São Paulo"`
2. ✓ Gera arquivo: `./data/raw-leads/{date}-google-maps.json` com 100+ leads
3. ✓ Validação: 0 erros críticos, apenas warnings esperados
4. ✓ Testes passam: `npm test -- scraper/` (80%+ coverage)
5. ✓ Logs estruturados salvos em `./logs/scraper-{date}.log`
6. ✓ README.md atualizado: como rodar scraper manualmente

**Antes de passar para Módulo 2:** Você + Sócio validam que 100+ leads foram capturados corretamente e podem ser inspecionados manualmente.

---

## 💾 Módulo 2: DATABASE & LEADS MANAGEMENT
### Status: [ ] Blocked until Module 1 = Done | Duração: 2 semanas (Sprint 2)

**Objetivo:** Persistir leads capturados em PostgreSQL com deduplicação e interface básica de consulta.

**Pré-requisito:** ✅ Módulo 1 100% funcional

### 2.1 Requisitos Funcionais

#### RF2.1 — Schema Database
- [ ] Tabela `users` (auth básica)
- [ ] Tabela `leads` (dados capturados + metadados)
- [ ] Tabela `scrape_jobs` (histórico de coletas)
- [ ] Índices otimizados: phone, city, source, created_at
- [ ] Migrations (Alembic) versionadas

**Schema leads:**
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  source VARCHAR(50),  -- 'google_maps', 'facebook', etc
  company_name VARCHAR(255),
  cnpj VARCHAR(14),
  url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_validated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  scraped_job_id UUID REFERENCES scrape_jobs(id)
);
```

#### RF2.2 — Deduplicação
- [ ] Detectar duplicatas por: `phone` (primária), `email+name` (secundária)
- [ ] Marcar duplicatas (não deletar, manter histórico)
- [ ] API endpoint: `GET /api/leads/duplicates`

#### RF2.3 — Importação de Dados
- [ ] API endpoint: `POST /api/leads/import` (aceita JSON do módulo 1)
- [ ] Validação: formato, campos obrigatórios
- [ ] Resposta: `{ imported: 100, duplicates: 5, errors: 0 }`
- [ ] CLI command: `python manage.py import-leads ./data/raw-leads/`

#### RF2.4 — CRUD de Leads
- [ ] `GET /api/leads` (listagem com filtros: city, source, validated)
- [ ] `GET /api/leads/{id}`
- [ ] `PUT /api/leads/{id}` (atualizar: email, company_name, status)
- [ ] `DELETE /api/leads/{id}` (soft delete)
- [ ] Export: `GET /api/leads/export/csv`

#### RF2.5 — Histórico de Scrape
- [ ] Tabela `scrape_jobs`: tracking de quando/quanto foi coletado
- [ ] Campos: source, city, keywords, status, result_count, created_at, completed_at
- [ ] API endpoint: `GET /api/scraper/jobs`

### 2.2 Requisitos Não-Funcionais

| RNF | Critério |
|-----|----------|
| **Performance** | Consultas <100ms (leads com índices) |
| **Integridade** | Sem duplicatas genuínas |
| **Confiabilidade** | 99.9% uptime DB (com backups) |
| **Escalabilidade** | Suporta 100K+ leads sem lag |
| **Segurança** | SQL injection prevention, prepared statements |

### 2.3 Acceptance Criteria

- [ ] PostgreSQL instalado e rodando localmente
- [ ] Schema criada e migrations aplicadas
- [ ] Importação do Módulo 1 (100 leads) funcionando
- [ ] CRUD endpoints testados (Postman/Insomnia)
- [ ] Deduplicação validada manualmente
- [ ] Database backups configurados
- [ ] Docs: schema diagram + API endpoints

### 2.4 Dependências

- PostgreSQL 15 instalado
- Alembic configurado
- FastAPI backend rodando
- Leads JSON do Módulo 1

### 2.5 Decisões de Design

**Por quê PostgreSQL em vez de MongoDB?**
- Dados estruturados e relacionados
- Queries complexas (dedup, filtros)
- ACID guarantees

**Deduplicação por phone primariamente:**
- Brasileiro sempre usa mesmo telefone
- Email pode não existir ou ser incorreto

**Soft deletes (is_active flag):**
- Manter histórico de leads
- Não perder dados de análise

### 2.6 Critério de Conclusão

✅ Módulo 2 está **100% COMPLETO** quando:

1. ✓ PostgreSQL DB criada com schema completo
2. ✓ 100 leads do Módulo 1 importados com sucesso
3. ✓ CRUD endpoints testados e documentados
4. ✓ Deduplicação funcionando (validar que 5 duplicatas foram flagadas)
5. ✓ Testes do backend passam: `npm test -- api/` (80%+ coverage)
6. ✓ Export CSV funciona: `GET /api/leads/export/csv` retorna arquivo válido

**Antes de passar para Módulo 3:** Você + Sócio acessam API diretamente (Postman) e validam que 95+ leads únicos estão no banco.

---

## 📊 Módulo 3: DASHBOARD & SDR
### Status: [ ] Blocked until Module 2 = Done | Duração: 2 semanas (Sprint 3)

**Objetivo:** Interface visual para prospecção (listar leads, filtrar, anotações, status) + micro CRM.

**Pré-requisito:** ✅ Módulo 2 100% funcional

### 3.1 Requisitos Funcionais

#### RF3.1 — Dashboard Principal
- [ ] Tabela de leads com colunas: nome, telefone, cidade, status, ação
- [ ] Paginação (50 leads/página)
- [ ] Filtros: city, source, validated, status
- [ ] Busca: por nome/telefone
- [ ] Virtual scrolling (performance com muitos leads)
- [ ] Sort: por data captura, cidade, nome

#### RF3.2 — Detalhes do Lead
- [ ] Modal com full profile: todos os dados
- [ ] Histórico: quando foi contatado, status anterior
- [ ] Anotações: campo livre para próximo contato, observações
- [ ] Status dropdown: "novo", "contatado", "interessado", "rejeitado", "cliente"
- [ ] Link direto WhatsApp: "enviar mensagem"

#### RF3.3 — CRM Básico
- [ ] Tabela `conversations` (BD)
- [ ] Status de cada lead: pipeline (novo → interessado → cliente)
- [ ] Last contact timestamp
- [ ] Assigned to (você/sócio)
- [ ] Notes field

#### RF3.4 — Dashboard Stats
- [ ] Total de leads capturados
- [ ] Leads por cidade (gráfico)
- [ ] Leads por fonte OSINT (pie chart)
- [ ] Taxa de contatação (%)
- [ ] Taxa de conversão (%)
- [ ] Leads novos vs. recentes

#### RF3.5 — Export & Reports
- [ ] Exportar seleção para CSV
- [ ] Relatório semanal (email com stats)
- [ ] Filtro por data range

### 3.2 Requisitos Não-Funcionais

| RNF | Critério |
|-----|----------|
| **UX** | Interface intuitiva para SDR fazer prospecção rápida |
| **Performance** | Dashboard carrega em <2s com 5K leads |
| **Responsividade** | Funciona em 1920x1080 (desktop padrão) |
| **Acessibilidade** | Contraste adequado, tabs navegáveis |

### 3.3 Acceptance Criteria

- [ ] Dashboard carrega 95+ leads do Módulo 2
- [ ] Filtros (cidade, source) funcionam
- [ ] Busca por nome/telefone retorna resultados corretos
- [ ] Stats calculadas corretamente
- [ ] Modal de detalhes abre sem lag
- [ ] Anotações salvas e recuperadas
- [ ] Status change persiste no BD
- [ ] Export CSV funciona

### 3.4 Dependências

- Backend FastAPI (Módulo 2) rodando
- 95+ leads no BD
- React + Electron setup

### 3.5 Decisões de Design

**Por quê tabela em vez de cards?**
- Espaço eficiente para SDR
- Múltiplas linhas visíveis
- Filtros side-by-side

**Stats no top do dashboard:**
- Visibilidade de KPIs
- Motivação para prospecção

**Modal em vez de nova página:**
- Context preservation
- Volta ao dashboard rápido

### 3.6 Critério de Conclusão

✅ Módulo 3 está **100% COMPLETO** quando:

1. ✓ Dashboard Electron app inicia: `npm run electron:dev`
2. ✓ Carrega 95+ leads da API em <2s
3. ✓ Filtros (cidade, source, status) funcionam
4. ✓ Busca por nome/telefone retorna resultado correto
5. ✓ Stats (totais, por cidade, por fonte) calculadas corretamente
6. ✓ Modal de detalhes abre, salva anotações e status
7. ✓ Testes E2E passam (Cypress/Playwright)
8. ✓ Export CSV válido com headers e dados

**Antes de passar para Módulo 4:** Você + Sócio fazem 10 prospecções manualmente (abrem lead, veem dados, anotam, mudam status) e validam fluxo.

---

## 💬 Módulo 4: WHATSAPP INTEGRATION
### Status: [ ] Blocked until Module 3 = Done | Duração: 2 semanas (Sprint 4)

**Objetivo:** Integração com WhatsApp para enviar mensagens automatizadas ou manuais com disparo por geolocalização.

**Pré-requisito:** ✅ Módulo 3 100% funcional

### 4.1 Requisitos Funcionais

#### RF4.1 — Envio Manual via WhatsApp
- [ ] Botão "Enviar WhatsApp" no lead detail
- [ ] Abre link: `https://wa.me/[phone]?text=[mensagem]`
- [ ] Template de mensagem personalizável (nome do lead)
- [ ] Histórico: registra se foi enviado ou não
- [ ] Integração com Twilio API (fase 2: Business API)

**Template padrão:**
```
Olá [NOME], tudo bem? 👋

Encontramos seu serviço de transporte escolar no Google Maps.
Gostaria de apresentar nossa solução de rastreamento em tempo real.

Você tem 5 minutos?

Abraços!
```

#### RF4.2 — Tabela de Conversas
- [ ] Tabela `conversations` (já em Módulo 2)
- [ ] API: `GET /api/conversations` (listar)
- [ ] API: `GET /api/conversations/{lead_id}` (histórico)
- [ ] API: `POST /api/conversations/{lead_id}/message` (registrar mensagem enviada)
- [ ] Status: pending, sent, replied, closed

#### RF4.3 — Geolocalização (MVP)
- [ ] Marca geográfica no lead: latitude/longitude (captura de Google Maps)
- [ ] Filtro: "leads em São Paulo" → gera lista para disparo em massa
- [ ] Não é automático (fase 2): você seleciona city e dispara manualmente
- [ ] Log: "100 mensagens enviadas para São Paulo em 2026-02-27"

#### RF4.4 — Templates de Mensagem
- [ ] Gerenciar 3-5 templates diferentes por persona (van, micro-ônibus)
- [ ] Variáveis: [NOME], [CIDADE], [SERVIÇO]
- [ ] Salvar templates em BD (tabela `message_templates`)

### 4.2 Requisitos Não-Funcionais

| RNF | Critério |
|-----|----------|
| **Legal/Compliance** | Respeitar LGPD (opt-in, histórico) |
| **Confiabilidade** | Mensagem não duplicada (idempotency) |
| **Rate Limiting** | Máx 60 msgs/min por lead |
| **Auditoria** | Histórico de quem enviou quando |

### 4.3 Acceptance Criteria

- [ ] Botão "Enviar WhatsApp" funciona no lead detail
- [ ] Link `wa.me` gerado corretamente (phone + template)
- [ ] Histórico de mensagens salvo em BD
- [ ] API endpoints de conversas funcionando
- [ ] Templates de mensagem gerenciáveis
- [ ] Disparo em massa por cidade funciona (manual, não automático)
- [ ] Rate limiting implementado
- [ ] Testes de integração passam

### 4.4 Dependências

- Twilio account (sandbox ou Business API)
- Leads no BD com telefone validado
- Dashboard funcionando (para ativar WhatsApp)
- LibreOffice/OpenOffice (para templates se quiser)

### 4.5 Decisões de Design

**Por quê Twilio + wa.me em MVP?**
- Twilio sandbox = free para testes
- wa.me = redirect nativo (sem API calls inicialmente)
- Business API é upgrade futuro

**Geolocalização manual em Sprint 4:**
- Reduz complexidade (não precisa de maps interativo)
- Você seleciona city + dispara
- Automático fica para Sprint 5

**Histórico em BD:**
- LGPD compliance (rastreabilidade)
- Analytics (quantas tentativas por lead)

### 4.6 Critério de Conclusão

✅ Módulo 4 está **100% COMPLETO** quando:

1. ✓ Botão "Enviar WhatsApp" abre wa.me corretamente
2. ✓ Histórico de mensagens salvo em BD
3. ✓ Templates gerenciáveis na interface
4. ✓ Disparo em massa por cidade funciona (manual)
5. ✓ Rate limiting previne spam
6. ✓ Testes de integração WhatsApp passam
7. ✓ Documentação: como configurar Twilio, usar templates

**Antes de Produção:** Você + Sócio enviam 20 mensagens manuais para leads reais (ou fase de testes) e validam entrega.

---

## 🗺️ Timeline & Roadmap Modular

```
SPRINT 1 (Semana 1-2):      Módulo 1 ✓
├─ Google Maps Scraper
├─ Validação básica
├─ Armazenamento JSON
└─ Entrada: CLI command → Saída: 100 leads

SPRINT 2 (Semana 3-4):      Módulo 2 ✓ (depende Sprint 1)
├─ PostgreSQL + Schema
├─ CRUD leads + dedup
├─ Importação do Módulo 1
└─ Entrada: JSON leads → Saída: BD atualizado

SPRINT 3 (Semana 5-6):      Módulo 3 ✓ (depende Sprint 2)
├─ React Dashboard
├─ Tabela + Filtros
├─ Stats + CRM básico
└─ Entrada: BD leads → Saída: Interface visual

SPRINT 4 (Semana 7-8):      Módulo 4 ✓ (depende Sprint 3)
├─ WhatsApp integration
├─ Templates + geoloc manual
├─ Histórico de mensagens
└─ Entrada: Leads + Templates → Saída: Messages sent

SPRINT 5 (Semana 9-10):     Polish & Deploy
├─ Testes e2e
├─ Performance optimization
├─ Docker containerization
├─ Deploy Railway
└─ Documentação final
```

**Total: 8-10 semanas, 210-270 horas, 2 pessoas**

---

## 📋 Matriz de Dependências

```
Módulo 1 (SCRAPER)
    ↓ (outputs: JSON leads)
Módulo 2 (DATABASE)
    ↓ (outputs: API leads)
Módulo 3 (DASHBOARD)
    ↓ (outputs: UI + CRM)
Módulo 4 (WHATSAPP)
    ↓ (outputs: Messages + History)
PRODUÇÃO
```

**Fluxo de validação entre módulos:**

| Transição | Validação | Responsável |
|-----------|-----------|------------|
| M1 → M2 | 100 leads JSON válidos, sem erros críticos | Você + Sócio |
| M2 → M3 | 95+ leads em BD, API endpoints funcionando | Você + Sócio |
| M3 → M4 | 10 prospecções manuais concluídas, UI intuitiva | Você + Sócio |
| M4 → Prod | 20 mensagens WhatsApp enviadas com sucesso | Você + Sócio |

---

## 🎯 Critérios de Sucesso

### Módulo 1 — SCRAPER
- ✅ Captura 100+ leads em <5 minutos
- ✅ 0 erros críticos (warnings ok)
- ✅ Dados validados (phone, address não vazios)
- ✅ Código testável e documentado

### Módulo 2 — DATABASE
- ✅ 95+ leads únicos em PostgreSQL
- ✅ Deduplicação funcionando
- ✅ CRUD completo + export CSV
- ✅ API testada com Postman

### Módulo 3 — DASHBOARD
- ✅ Interface intuitiva para SDR
- ✅ Carrega 5K leads em <2s
- ✅ Filtros + busca funcionando
- ✅ Stats acuradas

### Módulo 4 — WHATSAPP
- ✅ 20 mensagens enviadas com sucesso
- ✅ Histórico registrado
- ✅ Geolocalização manual funcionando
- ✅ Templates personalizáveis

### Geral
- ✅ 0 bloqueadores técnicos
- ✅ Código limpo e testado
- ✅ Documentação atualizada
- ✅ Pronto para produção (Railway)

---

## 📚 Documentação Complementar

**Documentos relacionados:**

1. **ANALYSIS-OSINT-MVP-COMPLETE.md** — Análise detalhada (mercado, OSINT, stack)
2. **FOLDER-STRUCTURE-CHECKLIST.md** — Estrutura de pastas + checklists por sprint
3. **PROJECT-SUMMARY.json** — Referência rápida (endpoints, riscos, métricas)
4. **Architecture Diagram** — (a ser criado durante Sprint 1)
5. **API Documentation** — (gerado com Swagger durante Sprint 2)

---

## 🚀 Próximos Passos

### ✅ Já Feito
- [x] Análise de mercado e OSINT
- [x] Tech stack definido
- [x] Roadmap geral
- [x] PRD modular criado

### ⏳ A Fazer (na sequência)
1. **Setup técnico (Semana 1, pré Sprint 1)**
   - [ ] Repositório GitHub criado
   - [ ] Node.js + Python environments
   - [ ] PostgreSQL + Redis instalados
   - [ ] Electron project scaffolding

2. **Sprint 1 (Semana 1-2)**
   - [ ] Implementar Módulo 1 (Google Maps Scraper)
   - [ ] Capturar 100+ leads
   - [ ] Validar dados

3. **Sprint 2 (Semana 3-4)**
   - [ ] Implementar Módulo 2 (Database)
   - [ ] Importar leads do Módulo 1
   - [ ] Testar CRUD

4. **Sprint 3 (Semana 5-6)**
   - [ ] Implementar Módulo 3 (Dashboard)
   - [ ] Fazer 10 prospecções manualmente
   - [ ] Validar UX

5. **Sprint 4 (Semana 7-8)**
   - [ ] Implementar Módulo 4 (WhatsApp)
   - [ ] Enviar 20 mensagens
   - [ ] Testar integrações

6. **Sprint 5 (Semana 9-10)**
   - [ ] Testes e2e
   - [ ] Performance tuning
   - [ ] Docker + deploy Railway
   - [ ] Docs finais

---

## 📞 Contatos & Support

**Seu contexto:**
- **Perfil:** Operador (Você + Sócio)
- **Objetivo:** Prospecção de vans escolares via OSINT + SDR
- **Linguagem:** Português BR
- **Tech level:** Operacional (não precisa entender cada linha de código)

**Como usar este PRD:**
1. Leia a visão geral (contexto estratégico)
2. Para cada sprint, foque no módulo correspondente
3. Valide 100% do módulo antes de passar para o próximo
4. Use FOLDER-STRUCTURE-CHECKLIST.md para tarefas dia a dia

---

**Versão:** 1.0.0-modular
**Data:** 2026-02-27
**Status:** ✅ Ready for Implementation
**Público:** Você + Sócio (PM Users)

---
