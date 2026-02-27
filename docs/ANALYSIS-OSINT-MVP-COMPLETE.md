# 🔍 ANÁLISE OSINT + ROADMAP MVP - APLICATIVO PROSPECÇÃO VANS ESCOLARES

**Data:** 26 de Fevereiro de 2026
**Versão:** 1.0 - Análise Completa
**Status:** ✅ Pronto para Implementação
**Analista:** Atlas (Business Analyst)

---

## 📋 ÍNDICE

1. [Clarificação & Context Mapping](#1-clarificação--context-mapping)
2. [Análise de Mercado (TAM/SAM)](#2-análise-de-mercado-tamsam)
3. [Estratégia OSINT - Mapa de Busca](#3-estratégia-osint---mapa-de-busca)
4. [Stack Técnico Recomendado](#4-stack-técnico-recomendado)
5. [Roadmap Detalhado por Sprint](#5-roadmap-detalhado-por-sprint)
6. [Arquitetura & Database Schema](#6-arquitetura--database-schema)
7. [Timeline & Estimativas](#7-timeline--estimativas)
8. [Próximos Passos](#8-próximos-passos)

---

## 1. CLARIFICAÇÃO & CONTEXT MAPPING

### 1.1 Informações do Produto (SaaS)

```yaml
PRODUTO:
  Nome: [Em definir]
  Tipo: SaaS - Gestão de Transporte Escolar
  Status: Pronto para vender

PREÇO:
  Van Escolar: R$ 50/mês (R$ 600/ano)
  Micro-Ônibus: R$ 80/mês (R$ 960/ano)
  Modelo: 1 assinatura por celular

FUNCIONALIDADES PRINCIPAIS:
  ✓ Gestão de rotas
  ✓ Rastreamento em tempo real
  ✓ Notificação WhatsApp (geolocalização)
  ✓ Micro CRM
  ✓ Controle de pagamento

DIFERENCIAL:
  ✓ Facilidade de uso (foco em pequenos operadores)
  ✓ Disparo WhatsApp automático por geolocalização
  ✓ Micro CRM integrado
  ✓ Controle de pagamento integrado
```

### 1.2 Público-Alvo

```yaml
SEGMENTAÇÃO:
  Tipo 1: Autônomos (1-3 vans próprias)
    - Proprietário do veículo
    - Sem empresa formal
    - Faturamento: R$ 2K-5K/mês

  Tipo 2: Pequenas Empresas (5-20 vans)
    - PJ registrada
    - Equipe pequena
    - Faturamento: R$ 50K-200K/mês

  Tipo 3: Micro-Ônibus Escolares
    - Maior capacidade
    - Maior estrutura
    - Melhor capacidade de pagamento

DISTRIBUIÇÃO POTENCIAL:
  ├─ 73.5K-105K autônomos (70%)
  ├─ 21K-30K pequenas empresas (20%)
  └─ 10.5K-15K micro-ônibus (10%)
```

### 1.3 Situação Atual

```yaml
CLIENTES:
  Status: Nenhum (não validado ainda)

LTV/CAC:
  Status: Não calculado (será calculado com validação)

NECESSIDADE IMEDIATA:
  1º: Encontrar leads (Scraper)
  2º: Gerenciar leads (Dashboard)
  3º: Vender (SDR + WhatsApp)
```

---

## 2. ANÁLISE DE MERCADO (TAM/SAM)

### 2.1 TAM (Total Addressable Market) - Brasil

```
ESTIMATIVA DE FROTA ESCOLAR:
├─ Total de vans no Brasil: ~2,5M
├─ % para transporte: ~10% = ~250K
├─ % para escolar: ~60% = ~150K
└─ % autônomos + pequenas: ~90% = ~135K

SEGMENTAÇÃO:
├─ Vans escolares: ~120K @ R$ 600/ano = R$ 72M
├─ Micro-ônibus: ~15K @ R$ 960/ano = R$ 14.4M
└─ TAM TOTAL: ~R$ 86.4M/ano

CENÁRIOS:
  Conservador: R$ 63M/ano (105K unidades)
  Moderado:   R$ 90.9M/ano (127.5K + 15K)
  Otimista:   R$ 109.2M/ano (150K + 20K)
```

### 2.2 SAM (Serviceable Addressable Market) - Fase 1

```
FASE 1 (PRÓXIMOS 12 MESES):
├─ Mercado alvo: 5 cidades grandes (SP, Rio, BH, Brasília, Recife)
├─ Estimado: ~25K vans/micro-ônibus acessíveis
├─ Penetração realista: 2-5%
├─ Estimativa: 500-1.250 assinantes
└─ Receita estimada: R$ 300K-1.2M

FASE 2 (ANOS 2-3):
├─ Expansão: Todas capitais + cidades >100K
├─ Estimado: ~60K vans
├─ Penetração: 10-20%
├─ Estimativa: 6K-12K assinantes
└─ Receita: R$ 3.6M-7.2M

INSIGHT:
  Mesmo com 5% penetração, TAM/SAM é gigante.
  Foco em qualidade de lead > quantidade.
```

---

## 3. ESTRATÉGIA OSINT - MAPA DE BUSCA

### 3.1 Ranking de Fontes por Eficiência

| # | Fonte | Volume | Qualidade | Automático | Prioridade | Leads/Mês |
|---|-------|--------|-----------|-----------|-----------|-----------|
| 1 | Google Maps | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Sim | 🔴 CRÍTICA | 2K-4K |
| 2 | Facebook Groups | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Semiaut | 🔴 CRÍTICA | 1K-2K |
| 3 | CNPJ Lookup | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Sim | 🔴 CRÍTICA | 1K-2K |
| 4 | OLX/Marketplace | ⭐⭐⭐ | ⭐⭐⭐ | Sim | 🟠 ALTA | 0.5K-1K |
| 5 | Google Dorking | ⭐⭐⭐⭐ | ⭐⭐⭐ | Manual | 🟠 ALTA | 0.3K-0.7K |
| 6 | LinkedIn | ⭐⭐⭐ | ⭐⭐⭐⭐ | Sim | 🟠 ALTA | 0.5K-1K |
| 7 | Waze/Apple Maps | ⭐⭐⭐ | ⭐⭐⭐⭐ | Semi | 🟡 MÉDIA | 0.2K-0.5K |

**TOTAL ESPERADO: 5K-9K leads/mês em steady state**

### 3.2 Detalhamento por Fonte

#### 🥇 FONTE 1: GOOGLE MAPS (Prioridade CRÍTICA)

```
POR QUÊ FUNCIONA:
  • Donos atualizam Google Maps (aparecem em buscas locais)
  • Telefone + endereço diretos
  • Resenhas indicam atividade recente

BUSCA IDEAL:
  "transporte escolar" + cidade
  "van escolar" + cidade
  "micro-ônibus" + cidade
  "educação infantil" + transporte

TÉCNICA:
  ├─ Google Maps API (oficial - pago)
  └─ OU Puppeteer + Cheerio (web scraping)

EXTRAÇÃO:
  • Nome da empresa/proprietário
  • Telefone
  • Endereço completo
  • URL do perfil
  • Resenhas (count + rating)
  • Horário de funcionamento
  • Website (se houver)

VALIDAÇÃO:
  • Ativo? (resenhas recentes = últimos 30 dias)
  • Telefone válido? (formato Brasil)
  • Endereço completo?

VOLUME ESPERADO: 3K-5K leads por cidade grande
  ├─ São Paulo: 3.5K-5K
  ├─ Rio: 2K-3K
  ├─ BH: 1.5K-2K
  ├─ Brasília: 1K-1.5K
  └─ Recife: 0.8K-1K

TOTAL FASE 1: 8K-12K leads

IMPLEMENTAÇÃO:
  Sprint 1, Dias 5-8
```

#### 🥈 FONTE 2: FACEBOOK GROUPS (Prioridade CRÍTICA)

```
GRUPOS PRINCIPAIS:
  Brasil (Nacional):
    • "Transportadores de Alunos do Brasil"
    • "Associação Brasileira Transporte Escolar"
    • "Fórum de Motoristas Escolares"

  Por Estado (exemplo SP):
    • "Transporte Escolar SP"
    • "Donos de Van - São Paulo"
    • "Motoristas Escolares SP"
    • "Empresas de Transporte Escolar - SP"

ESTRATÉGIA:
  1. Identificar grupos com 500+ membros
  2. Scrape posts últimos 30 dias
  3. Extrair nomes + telefones
  4. Validar: proprietário da van?
  5. Enriquecer com Google (nome + cidade)

EXTRAÇÃO:
  • Nome do autor
  • Telefone (se público no post)
  • Email (se publicado)
  • Cidade
  • Contexto (está realmente vendendo transporte?)

VOLUME ESPERADO: 2K-4K por estado
  ├─ SP: 2K-4K
  ├─ MG: 0.8K-1.5K
  ├─ RJ: 0.8K-1.5K
  ├─ BA: 0.5K-1K
  └─ Outros: 2K-3K

TOTAL FASE 1: 6K-10K leads

DESAFIO:
  Facebook pode bloquear scraping

SOLUÇÃO:
  ├─ Usar proxy se necessário
  ├─ Delay entre requests (2-5s)
  ├─ Ou fazer manualmente 1x/mês
  └─ Ou pagar Facebook API oficial

IMPLEMENTAÇÃO:
  Sprint 2, Dias 1-4
```

#### 🥉 FONTE 3: CNPJ LOOKUP (Prioridade CRÍTICA)

```
POR QUÊ:
  • Empresas registradas = mais qualificadas
  • Dados públicos = legal fazer scraping
  • Menos concorrência (poucos exploram)

TÉCNICA:
  1. CNPJ.com.br API ou BrasilAPI
  2. Filtrar por atividade: "Transporte de passageiros"
  3. Filtrar por tamanho: Pequeno + Médio
  4. Filtrar por status: Ativo

INTEGRAÇÃO:
  • Receita Federal
  • JUCEG/JUCESP (por estado)
  • Serasav (dados de empresa)

EXTRAÇÃO:
  • Razão Social
  • CNPJ
  • Telefone
  • Email
  • Representante/Sócio
  • Endereço
  • Data de constituição
  • Faturamento (se público)

VOLUME ESPERADO: 5K-8K empresas = 8K-12K leads

VANTAGEM:
  • Dados mais estruturados
  • Menos duplicatas
  • Contato com empresa (não indivíduo)

IMPLEMENTAÇÃO:
  Sprint 2, Dias 5-8
```

#### 🟠 FONTES SECUNDÁRIAS

```
FONTE 4: OLX + MARKETPLACE
  • Donos anunciam serviço
  • Anúncios recentes = negócio ativo
  • 1K-3K leads/mês (renovado constantemente)

FONTE 5: GOOGLE DORKING
  site:facebook.com "transporte escolar" "whatsapp"
  site:*.com.br "van escolar" "celular"
  "empresa de transporte" "educação infantil" filetype:pdf
  • 500-1K leads/mês

FONTE 6: LINKEDIN
  Buscar: "motorista escolar", "operador transporte"
  • 500-1K leads/mês
```

### 3.3 Fluxo de Busca Integrado (Semanal)

```
SEGUNDA-FEIRA:
  → Rodar Google Maps scraper (5 cidades)
  → Resultado: 500-800 leads

TERÇA-FEIRA:
  → Scrape Facebook (15-20 grupos)
  → Resultado: 300-500 leads

QUARTA-FEIRA:
  → CNPJ lookup (empresas novas)
  → Resultado: 200-400 leads

QUINTA-FEIRA:
  → OLX scrape (anúncios novos)
  → Resultado: 150-300 leads

SEXTA-FEIRA:
  → Google Dorking + LinkedIn
  → Resultado: 100-200 leads

SÁBADO-DOMINGO:
  → Validação manual (revisão)
  → Deduplicação
  → Resultado: Lista limpa pronta para contato

TOTAL SEMANAL: 1.250-2.200 leads novos
TOTAL MENSAL: 5K-9K leads
```

---

## 4. STACK TÉCNICO RECOMENDADO

### 4.1 Arquitetura Geral

```
┌─────────────────────────────────────────────────────┐
│                 ARQUITETURA MVP                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │     FRONTEND (Desktop)                     │   │
│  │  • Electron 25+                            │   │
│  │  • React 18                                │   │
│  │  • TailwindCSS                             │   │
│  │  • Axios                                   │   │
│  └────────┬─────────────────────────────────┘   │
│           │                                      │
│  ┌────────▼─────────────────────────────────┐   │
│  │     BACKEND (API)                        │   │
│  │  • Python 3.11                           │   │
│  │  • FastAPI (async)                       │   │
│  │  • Pydantic (validation)                 │   │
│  │  • SQLAlchemy (ORM)                      │   │
│  └────────┬──────────────┬────────────────┘   │
│           │              │                      │
│  ┌────────▼────┐   ┌─────▼───────────────┐   │
│  │ SCRAPER     │   │  JOB QUEUE          │   │
│  │  • Node.js  │   │  • Celery           │   │
│  │  • Puppeteer│   │  • Redis            │   │
│  │  • Cheerio  │   │  • Bull.js          │   │
│  └────────┬────┘   └─────────────────────┘   │
│           │              │                      │
│  ┌────────▼──────────────▼───────────────┐   │
│  │     DATABASE                          │   │
│  │  • PostgreSQL (dados)                 │   │
│  │  • Redis (cache + queue)              │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │     INTEGRAÇÕES EXTERNAS              │   │
│  │  • Twilio (WhatsApp API)              │   │
│  │  • Google Maps API                    │   │
│  │  • CNPJ API (BrasilAPI)               │   │
│  │  • Facebook Graph API                 │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │     DEPLOY                            │   │
│  │  • Docker + Docker Compose (local)   │   │
│  │  • Railway (cloud)                    │   │
│  └───────────────────────────────────────┘   │
│                                               │
└─────────────────────────────────────────────────────┘
```

### 4.2 Stack Detalhado

```yaml
FRONTEND:
  Desktop:
    - Electron 25+ (multiplataforma)
    - React 18 (UI components)
    - TypeScript (type safety)
    - TailwindCSS (styling rápido)
    - Axios (HTTP requests)
    - React Router (navigation)
    - Chart.js (gráficos simples)
    - react-table (tabelas grandes)

  Build:
    - Vite (bundler rápido)
    - electron-builder (packager)

BACKEND:
  Runtime:
    - Python 3.11
    - pip (package manager)

  Framework:
    - FastAPI (async, rápido, automático Swagger)
    - Pydantic (data validation)
    - SQLAlchemy (ORM)
    - Alembic (migrations)

  Utilities:
    - python-dotenv (env vars)
    - httpx (async HTTP)
    - bcrypt (password hashing)
    - python-multipart (form uploads)

SCRAPER:
  Runtime:
    - Node.js 18+
    - npm (package manager)

  Libraries:
    - Puppeteer (headless browser)
    - puppeteer-extra (stealth plugins)
    - cheerio (HTML parsing)
    - got (HTTP requests)
    - axios (alternativa)

  Utilities:
    - dotenv (env vars)
    - node-cron (scheduler)

DATABASE:
  Primary:
    - PostgreSQL 15 (relational DB)

  Cache/Queue:
    - Redis 7 (cache + message broker)

  ORM:
    - SQLAlchemy (Python)
    - node-postgres (Node.js)

TASK QUEUE:
  - Celery (Python task queue)
  - Redis (broker)
  - Flower (monitoring - opcional)

DEPLOYMENT:
  Local:
    - Docker
    - Docker Compose

  Cloud:
    - Railway (simple deployment)
    - Alternativa: Vercel (frontend), Render (backend)

  Version Control:
    - Git
    - GitHub (private repo)

TESTING:
  Python:
    - pytest
    - pytest-asyncio

  JavaScript:
    - Jest
    - Testing Library

  Integration:
    - Postman (API testing)

MONITORING:
  - Sentry (error tracking)
  - LogRocket (frontend monitoring)
  - Simple logging (stdout)
```

### 4.3 Alternativas Consideradas

```yaml
ALTERNATIVA A: Node.js Full-Stack
  Vantagem: Tudo em uma linguagem
  Desvantagem: Menos otimizado para scraping
  Recomendação: ❌ Não recomendado para MVP

ALTERNATIVA B: Python + Django
  Vantagem: Maduro, muitos pacotes
  Desvantagem: Mais lento que FastAPI
  Recomendação: ❌ Não recomendado para performance

ALTERNATIVA C: No-Code (Make, Zapier)
  Vantagem: Implementação rápida
  Desvantagem: Custoso, limitado, sem controle
  Recomendação: ❌ Não adequado para scraping pesado

STACK RECOMENDADO: Python + Node.js (Opção A) ✅
```

---

## 5. ROADMAP DETALHADO POR SPRINT

### 5.1 Timeline Geral

```
SPRINT 1 (Semanas 1-2): Setup + Google Maps Scraper
├─ Horas: 40-50h
├─ Deliverable: 100+ leads em DB
└─ Status: 🟡 Básico mas funcional

SPRINT 2 (Semanas 3-4): Facebook + CNPJ + Deduplicação
├─ Horas: 50-60h
├─ Deliverable: 5K-8K leads únicos
└─ Status: 🟡 Múltiplas fontes

SPRINT 3 (Semanas 5-6): Frontend Dashboard
├─ Horas: 50-60h
├─ Deliverable: Interface funcional
└─ Status: 🟡 Visualização completa

SPRINT 4 (Semanas 7-8): WhatsApp + Sistema Vendas
├─ Horas: 40-50h
├─ Deliverable: Chat + SDR workflow
└─ Status: 🟢 MVP Completo

SPRINT 5 (Semanas 9-10): Testes + Deploy + Docs
├─ Horas: 30-40h
├─ Deliverable: App pronta para uso
└─ Status: ✅ Produção

TOTAL: 210-270 horas
TIMELINE: 8-10 semanas com 2 pessoas @ 5h/dia
```

### 5.2 SPRINT 1 - Setup + Google Maps Scraper

#### Dia 1-2: SETUP INICIAL (8h)

```
[ ] TAREFAS:

1. Setup ambiente (3h)
   [ ] Python 3.11 (pyenv ou Conda)
   [ ] Node.js 18+ (nvm)
   [ ] PostgreSQL local (Docker)
       docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres
   [ ] Redis local (Docker)
       docker run -d --name redis -p 6379:6379 redis
   [ ] Git + GitHub (repo privado)

2. Estrutura de pastas (2h)
   [ ] /backend (Python)
   [ ] /scraper (Node.js)
   [ ] /frontend (Electron)
   [ ] /docker-compose.yml
   [ ] /README.md
   [ ] /.gitignore

3. Docker Compose (3h)
   [ ] Criar docker-compose.yml
   [ ] postgres service
   [ ] redis service
   [ ] backend service
   [ ] scraper service
   [ ] Testar: docker-compose up

DELIVERABLE: Repo estruturado, ambiente rodando
```

#### Dia 3-4: BACKEND BÁSICO (12h)

```
[ ] TAREFAS:

1. FastAPI setup (4h)
   [ ] pip install fastapi uvicorn sqlalchemy psycopg2 pydantic
   [ ] Criar main.py
   [ ] Setup CORS
   [ ] Hello world endpoint

2. Database setup (5h)
   [ ] SQLAlchemy config
   [ ] Alembic migrations init
   [ ] Models:
       - User (id, email, password_hash, name)
       - Lead (id, name, phone, email, address, city, source, ativo, validado)
       - ScrapeJob (id, fonte, cidade, status, resultado_count, data)
   [ ] Create tables
   [ ] Seed com 10 leads fake

3. Routes CRUD (3h)
   [ ] POST /leads (criar lead)
   [ ] GET /leads (listar todos)
   [ ] GET /leads/{id} (detalhe)
   [ ] PUT /leads/{id} (editar)
   [ ] DELETE /leads/{id} (deletar)
   [ ] Testar com Insomnia/Postman

DELIVERABLE: API CRUD funcional
```

#### Dia 5-8: SCRAPER GOOGLE MAPS (20h)

```
[ ] TAREFAS:

1. Setup Puppeteer (3h)
   [ ] npm init -y
   [ ] npm install puppeteer puppeteer-extra cheerio got dotenv
   [ ] Criar .env (API_KEY, etc)

2. Script Google Maps (12h)
   [ ] Função: buscar(cidade, keyword)
       └─ Input: "transporte escolar", "São Paulo"
   [ ] Abrir Google Maps com Puppeteer
   [ ] Buscar keyword + cidade
   [ ] Scroll e coletar 30 primeiros resultados
   [ ] Para cada resultado:
       ├─ Nome
       ├─ Telefone
       ├─ Endereço
       ├─ URL
       ├─ Rating + resenhas
       └─ Horário
   [ ] Salvar em JSON
   [ ] Error handling (retry, proxy)

3. Integração (5h)
   [ ] Scraper → POST /api/leads
   [ ] Backend valida + deduplica (básico)
   [ ] Armazena em PostgreSQL
   [ ] Log de execução

TESTES (5h)
   [ ] Rodar em 1 cidade (São Paulo)
   [ ] Coletar 50-100 leads
   [ ] Validar dados no DB
   [ ] Verificar duplicatas

DELIVERABLE: Script funcional, 100+ leads em DB
```

#### Checklist Sprint 1

```
✅ Git repo + estrutura
✅ Docker Compose rodando
✅ FastAPI app
✅ Database models
✅ CRUD endpoints
✅ Puppeteer Google Maps scraper
✅ Integração scraper → backend
✅ Testes com 100 leads
✅ README.md inicial
```

**Status:** 🟡 Scraper básico funcionando

---

### 5.3 SPRINT 2 - Facebook + CNPJ + Deduplicação

#### Dia 1-4: FACEBOOK GROUPS SCRAPER (12h)

```
[ ] TAREFAS:

1. Identificar grupos (2h)
   [ ] Google: site:facebook.com "transporte escolar"
   [ ] Listar top 15 grupos por estado
   [ ] Armazenar em data/facebook_groups.json

2. Scraper Facebook (7h)
   [ ] Script: scraper/facebook-groups.js
   [ ] Para cada grupo:
       ├─ Entrar (Puppeteer + login)
       ├─ Buscar posts (últimos 30 dias)
       ├─ Extrair: autor, texto, timestamp
       ├─ Regex para telefone
       ├─ Regex para email
       └─ Validar: é transporte escolar?
   [ ] Delay 2-5s entre requests (não bloquear)
   [ ] Output: facebook_leads.json

3. Integração (3h)
   [ ] Importar em /api/leads
   [ ] Deduplicação básica (telefone)
   [ ] Log de origem

DESAFIO: Facebook pode bloquear
SOLUÇÃO: Proxy se necessário, ou manual 1x/mês

DELIVERABLE: 2K-4K leads Facebook
```

#### Dia 5-8: CNPJ LOOKUP (15h)

```
[ ] TAREFAS:

1. CNPJ API setup (3h)
   [ ] Registrar em BrasilAPI ou CNPJ.info
   [ ] npm install axios (para chamadas HTTP)
   [ ] .env com API key

2. Script CNPJ (8h)
   [ ] Função: buscar_cnpj(nome_empresa)
   [ ] Chamar BrasilAPI/CNPJ.info
   [ ] Filtrar: "transporte", "escolar", "educação"
   [ ] Extrair:
       ├─ CNPJ
       ├─ Razão Social
       ├─ Telefone
       ├─ Email
       ├─ Sócio/Representante
       ├─ Endereço
       └─ Status (ativo)
   [ ] Rate limit: 1 req/seg
   [ ] Output: cnpj_leads.json

3. Integração (4h)
   [ ] Importar em /api/leads
   [ ] Associar com leads já existentes
   [ ] Deduplicação avançada

DELIVERABLE: 1K-2K leads CNPJ
```

#### Dia 9-10: DEDUPLICAÇÃO + VALIDAÇÃO (10h)

```
[ ] TAREFAS:

1. Lógica deduplicação (6h)
   [ ] Criar: backend/deduplicator.py
   [ ] Algoritmos:
       ├─ Phone matching (mesmo tel = dup)
       ├─ Fuzzy name (Levenshtein, 85%+ = dup)
       ├─ Address matching (fuzzy, 80%+ = dup)
       └─ Email matching (exato)
   [ ] Manter lead mais completo
   [ ] Log cada match
   [ ] Teste com 5K leads

2. Validação leads (4h)
   [ ] Telefone válido? (regex + tamanho)
   [ ] Email válido? (regex)
   [ ] Endereço completo?
   [ ] "Ativo"? (resenhas recentes)
   [ ] Flag: is_validated = True/False
   [ ] Criar campo em DB

DELIVERABLE: 5K-8K leads únicos + limpos
```

#### Checklist Sprint 2

```
✅ Facebook Groups scraper
✅ CNPJ lookup scraper
✅ Deduplicação fuzzy matching
✅ Validação automática
✅ Pipeline completo
✅ 5K-8K leads em DB
```

**Status:** 🟡 Múltiplas fontes funcionando

---

### 5.4 SPRINT 3 - Frontend Dashboard

#### Dia 1-3: SETUP ELECTRON + REACT (12h)

```
[ ] TAREFAS:

1. Criar Electron app (4h)
   [ ] npx create-electron-app frontend --template=webpack
   [ ] npx create-react-app frontend (alternativa)
   [ ] Setup TypeScript
   [ ] TailwindCSS config
   [ ] IPC entre main process e renderer

2. Estrutura de pastas (2h)
   [ ] src/components/ (React components)
   [ ] src/pages/ (full pages)
   [ ] src/services/ (API calls)
   [ ] src/types/ (TypeScript interfaces)
   [ ] electron/ (main.ts)
   [ ] public/ (assets)

3. Hello World (6h)
   [ ] Render app in Electron
   [ ] React Router setup
   [ ] TailwindCSS working
   [ ] Axios config (baseURL = http://localhost:8000)
   [ ] Testar comunicação API

DELIVERABLE: App básico rodando
```

#### Dia 4-6: TELAS PRINCIPAIS (18h)

```
[ ] TELAS:

1. DASHBOARD (5h)
   [ ] Cards com métricas:
       ├─ Total de leads
       ├─ Leads "para contatar"
       ├─ Taxa de resposta
       └─ Últimas conversões
   [ ] Gráfico (pie chart: leads por fonte)
   [ ] Botão: "Novo Scrape"

2. LISTA DE LEADS (6h)
   [ ] Tabela com colunas:
       ├─ Nome
       ├─ Telefone
       ├─ Endereço
       ├─ Fonte
       ├─ Status
       └─ Ações (editar, deletar)
   [ ] Filtros: fonte, status, data
   [ ] Busca por nome
   [ ] Paginação (20 por página)
   [ ] Export CSV

3. DETALHE LEAD (4h)
   [ ] Dados completos
   [ ] Histórico de contato
   [ ] Botão: "Enviar WhatsApp"
   [ ] Campo Notas
   [ ] Dropdown Status

4. SCRAPER CONFIG (3h)
   [ ] Dropdown: fonte (Google Maps, Facebook, CNPJ)
   [ ] Multi-select: cidades
   [ ] Input: keywords
   [ ] Botão: "Executar agora"
   [ ] Status live: "Scraping... 45 leads"

DELIVERABLE: UI completa
```

#### Dia 7-8: INTEGRAÇÃO + TESTES (10h)

```
[ ] TAREFAS:

1. API Integration (5h)
   [ ] Testar GET /leads
   [ ] Testar POST /leads
   [ ] Testar DELETE /leads/{id}
   [ ] Testar POST /scrape (iniciar)
   [ ] Loading states em buttons
   [ ] Error alerts (try-catch)

2. Performance (3h)
   [ ] Virtual scrolling para 10K+ leads
   [ ] Debounce em filtros
   [ ] Memoization em components

3. Testes (2h)
   [ ] Listar 100 leads ✓
   [ ] Filtrar por fonte ✓
   [ ] Buscar por nome ✓
   [ ] Deletar lead ✓
   [ ] Export CSV ✓

DELIVERABLE: Dashboard funcional
```

#### Checklist Sprint 3

```
✅ Electron + React setup
✅ Dashboard com métricas
✅ Lista de Leads (filtros, paginação)
✅ Detalhe Lead
✅ Scraper Config UI
✅ API integration completa
✅ Testes manuais
```

**Status:** 🟡 Dashboard funcional

---

### 5.5 SPRINT 4 - WhatsApp + Sistema Vendas

#### Dia 1-3: TWILIO WHATSAPP (12h)

```
[ ] TAREFAS:

1. Setup Twilio (3h)
   [ ] Criar conta (twilio.com)
   [ ] Projeto WhatsApp Sandbox
   [ ] Copiar SID + AUTH TOKEN
   [ ] .env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN

2. Backend integration (5h)
   [ ] pip install twilio
   [ ] Routes novos:
       ├─ POST /whatsapp/send
       ├─ POST /whatsapp/webhook
       └─ GET /whatsapp/conversations/{lead_id}
   [ ] Função: send_message(phone, text)
   [ ] Webhook para receber respostas
   [ ] Log em DB

3. Testes (4h)
   [ ] Enviar 5 mensagens teste
   [ ] Receber respostas
   [ ] Validar log em DB

DESAFIO: Twilio sandbox é limitado (5 contatos)
SOLUÇÃO: MVP usa sandbox, depois migra para Business API

DELIVERABLE: WhatsApp funcionando
```

#### Dia 4-6: SISTEMA VENDAS (14h)

```
[ ] TAREFAS:

1. Database: Conversation table (2h)
   [ ] id
   [ ] lead_id
   [ ] messages (JSON array)
   [ ] last_message_date
   [ ] conversion_status (novo, em andamento, convertido)
   [ ] notes
   [ ] assigned_to (user_id)
   [ ] created_at, updated_at

2. Backend routes (5h)
   [ ] GET /conversations
   [ ] GET /conversations/{lead_id}
   [ ] POST /conversations/{lead_id}/message
   [ ] PUT /conversations/{lead_id}/status
   [ ] GET /conversations/stats

3. Frontend: Tela Vendas (7h)
   [ ] Lista de conversas
   [ ] Chat box
   [ ] Campo para digitar
   [ ] Histórico de mensagens
   [ ] Status (entregue, lido)
   [ ] Info do lead
   [ ] Notas editáveis
   [ ] Templates de mensagens

DELIVERABLE: Sistema vendas básico
```

#### Dia 7-8: TEMPLATES + OTIMIZAÇÕES (8h)

```
[ ] TAREFAS:

1. Templates de mensagens (4h)
   [ ] Armazenar em backend
   [ ] CRUD de templates
   [ ] Placeholders: {nome}, {empresa}, {cidade}
   [ ] Exemplo template:
       "Olá {nome}! Vi que você opera em {cidade}...
        Temos solução de rastreamento que reduz custos.
        Quer conhecer? [link]"

2. UI Polish (4h)
   [ ] Design responsivo
   [ ] Ícones melhorados
   [ ] Transitions suaves
   [ ] Loading states

DELIVERABLE: MVP completo
```

#### Checklist Sprint 4

```
✅ Twilio WhatsApp setup
✅ Backend routes WhatsApp
✅ Frontend Tela Vendas
✅ Chat box funcional
✅ Templates de mensagens
✅ Histórico de contatos
```

**Status:** ✅ MVP Completo!

---

### 5.6 SPRINT 5 - Testes + Deploy

#### Dia 1-3: TESTES & BUG FIXES (10h)

```
[ ] TESTES FUNCIONAIS:

1. Scraper (3h)
   [ ] Google Maps: 50 leads
   [ ] Facebook: 30 leads
   [ ] CNPJ: 20 leads
   [ ] Deduplicação: zero duplicatas
   [ ] Validação: todos válidos

2. Dashboard (3h)
   [ ] Listar 1K leads: <3s
   [ ] Filtrar: <1s
   [ ] Paginação: suave
   [ ] Export CSV: rápido

3. WhatsApp (2h)
   [ ] Enviar mensagem
   [ ] Receber resposta
   [ ] Log em conversas
   [ ] Status atualiza

4. Geral (2h)
   [ ] Edge cases
   [ ] Tratamento de erros
   [ ] Input validation
```

#### Dia 4-5: DEPLOY (10h)

```
[ ] DEPLOY LOCAL:

1. Docker setup (3h)
   [ ] Dockerfile (backend)
   [ ] Dockerfile (scraper)
   [ ] docker-compose.yml
   [ ] Testar: docker-compose up

2. Cloud Deploy (5h)
   [ ] Railway account
   [ ] Connect GitHub repo
   [ ] Setup environment variables
   [ ] Deploy backend
   [ ] Deploy scraper
   [ ] Testes em produção

3. Build desktop (2h)
   [ ] npm run build (Electron)
   [ ] electron-builder
   [ ] Gerar .exe (Windows)
   [ ] Instalador automático
```

#### Dia 6-8: DOCUMENTAÇÃO (10h)

```
[ ] DOCUMENTAÇÃO:

1. README.md (3h)
   [ ] Visão geral do projeto
   [ ] Features
   [ ] Tech stack
   [ ] Setup local
   [ ] Como rodar
   [ ] Como fazer deploy

2. SETUP.md (3h)
   [ ] Passo a passo instalação
   [ ] Requisitos (Python, Node, PostgreSQL)
   [ ] Docker setup
   [ ] Variáveis de ambiente

3. API.md (2h)
   [ ] Documentação de endpoints
   [ ] Parâmetros
   [ ] Exemplos de requisição/resposta
   [ ] (FastAPI Swagger docs automático)

4. USER_GUIDE.md (2h)
   [ ] Como usar o app
   [ ] Dashboard
   [ ] Scraper
   [ ] Vendas
   [ ] Troubleshooting
```

#### Checklist Sprint 5

```
✅ Testes completos
✅ Docker setup
✅ Deploy Railway
✅ Build Electron
✅ README completo
✅ API documentation
✅ User guide
```

**Status:** ✅ **MVP PRONTO PARA USAR**

---

## 6. ARQUITETURA & DATABASE SCHEMA

### 6.1 Database Schema (PostgreSQL)

```sql
-- USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- LEADS (Prospectos)
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  address VARCHAR(500),
  city VARCHAR(100),
  source VARCHAR(50),
  company_name VARCHAR(255),
  cnpj VARCHAR(18),
  is_active BOOLEAN DEFAULT TRUE,
  is_validated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CONVERSAS / HISTÓRICO
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  status VARCHAR(50),
  assigned_to INTEGER REFERENCES users(id),
  notes TEXT,
  last_contact TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- MENSAGENS WHATSAPP
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  author VARCHAR(50),
  text TEXT,
  status VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- JOBS DE SCRAPING
CREATE TABLE scrape_jobs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50),
  city VARCHAR(100),
  keywords VARCHAR(500),
  status VARCHAR(50),
  result_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Índices
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
```

### 6.2 API Endpoints

```
LEADS:
  GET    /api/leads              # Listar todas
  GET    /api/leads/{id}         # Detalhe
  POST   /api/leads              # Criar manual
  PUT    /api/leads/{id}         # Editar
  DELETE /api/leads/{id}         # Deletar
  GET    /api/leads/export/csv   # Exportar

SCRAPER:
  POST   /api/scraper/run        # Iniciar scrape
  GET    /api/scraper/jobs       # Histórico jobs
  GET    /api/scraper/jobs/{id}  # Status 1 job

WHATSAPP / VENDAS:
  GET    /api/conversations      # Todas conversas
  GET    /api/conversations/{id} # Histórico
  POST   /api/conversations/{id}/message  # Enviar msg
  PUT    /api/conversations/{id}/status   # Status

STATS:
  GET    /api/conversations/stats # Métricas
  GET    /api/leads/stats         # Lead stats

AUTH:
  POST   /api/auth/login         # Login
  POST   /api/auth/logout        # Logout
  GET    /api/auth/me            # Dados usuário
```

---

## 7. TIMELINE & ESTIMATIVAS

### 7.1 Horas por Sprint

```
SPRINT 1: 40-50h
  ├─ Setup: 8h
  ├─ Backend: 12h
  └─ Scraper: 20h

SPRINT 2: 50-60h
  ├─ Facebook: 12h
  ├─ CNPJ: 15h
  └─ Deduplicação: 10h

SPRINT 3: 50-60h
  ├─ Setup: 12h
  ├─ Telas: 18h
  └─ Integração: 10h

SPRINT 4: 40-50h
  ├─ Twilio: 12h
  ├─ Vendas: 14h
  └─ Templates: 8h

SPRINT 5: 30-40h
  ├─ Testes: 10h
  ├─ Deploy: 10h
  └─ Docs: 10h

TOTAL: 210-270 horas
```

### 7.2 Timeline com 2 Pessoas

```
Cenário: 2 pessoas × 5h/dia × 5 dias/semana

Pessoa 1 (Backend + Scraper): ~150h
  └─ 6-7 semanas @ 5h/dia

Pessoa 2 (Frontend + Setup): ~120h
  └─ 5-6 semanas @ 5h/dia

Timeline paralelo: 8-10 semanas

MÊS 1: Sprints 1-2 (Scraper + dados)
MÊS 2: Sprints 3-5 (Dashboard + Vendas + Deploy)
```

### 7.3 Dependências & Riscos

```
RISCOS:

1. Google Maps rate limiting
   Probabilidade: MÉDIA
   Impacto: Bloquear scraper
   Mitigation: Proxy, delays, API oficial

2. Facebook API bloqueio
   Probabilidade: ALTA
   Impacto: Parar de coletar leads
   Mitigation: Manual 1x/mês ou Business API

3. Twilio sandbox limitado (5 contatos)
   Probabilidade: CERTA
   Impacto: Testar com <5 pessoas
   Mitigation: Migrar para WhatsApp Business API (pago)

4. Deduplicação lenta com 10K+ leads
   Probabilidade: MÉDIA
   Impacto: Lentidão
   Mitigation: Índices DB, cache Redis, background job

5. Performance dashboard com muitos leads
   Probabilidade: MÉDIA
   Impacto: UI lenta
   Mitigation: Virtual scrolling, pagination, lazy load
```

---

## 8. PRÓXIMOS PASSOS

### 8.1 Antes de Codificar (Semana 1)

```
[ ] VALIDAÇÃO RÁPIDA:
    [ ] Fazer scraping manual em 1 cidade
        └─ Google Maps "transporte escolar" SP
    [ ] Coletar 50 leads manualmente
    [ ] Testar: quantos têm WhatsApp?
    [ ] Testar: quantos responderam?

    OBJETIVO: Validar que mercado existe e é acessível

[ ] PESQUISA DE DADOS:
    [ ] Quantos CNPJs de transporte escolar existem?
    [ ] Quais são os 10 maiores groups Facebook?
    [ ] Volume Google Maps por cidade?

[ ] BENCHMARKING:
    [ ] Testar Trackfy/Bluebus (concorrentes)
    [ ] Entender pain points
```

### 8.2 Setup Técnico (Semana 2)

```
[ ] Decisões:
    [ ] Python 3.11 + Node.js 18 confirmado?
    [ ] PostgreSQL local (Docker)?
    [ ] Railway para deploy?
    [ ] Twilio para WhatsApp?

[ ] Preparação:
    [ ] Criar repo GitHub privado
    [ ] Setup local completo
    [ ] Primeira commit: "Initial commit - estrutura vazia"
    [ ] Documentar setup em README

[ ] Time:
    [ ] Pessoa 1: Backend + Scraper
    [ ] Pessoa 2: Frontend + Integração
    [ ] Sincronização diária (15min standup)
```

### 8.3 Desenvolvimento (Sprints 1-5)

```
[ ] Sprint 1: Setup + Google Maps (2 semanas)
[ ] Sprint 2: Facebook + CNPJ (2 semanas)
[ ] Sprint 3: Dashboard (2 semanas)
[ ] Sprint 4: WhatsApp + Vendas (2 semanas)
[ ] Sprint 5: Testes + Deploy (2 semanas)
```

### 8.4 Pós-MVP

```
MVP2 (Depois do MVP1 estar funcionando):

[ ] Follow-up automático
    └─ Mensagens agendadas a leads sem resposta

[ ] AI Chatbot
    └─ Responder mensagens automaticamente

[ ] Scoring de leads
    └─ IA prediz qual vai converter

[ ] Analytics avançado
    └─ Relatórios PDF/Excel

[ ] Integração Salesforce/Pipedrive
    └─ Sincronizar leads com CRM
```

---

## RESUMO EXECUTIVO

```
PROJETO: Aplicativo Desktop para Prospecção OSINT + Vendas de SaaS Transporte Escolar

MERCADO:
  • TAM Brasil: R$ 63-109M/ano
  • SAM Fase 1: R$ 300K-1.2M/ano
  • Leads viáveis: 5K-9K/mês

STACK:
  Frontend: Electron + React + TailwindCSS
  Backend: FastAPI + Python
  Scraper: Puppeteer + Node.js
  DB: PostgreSQL + Redis
  Deploy: Railway + Docker

TIMELINE:
  • 8-10 semanas
  • 210-270 horas
  • 2 pessoas @ 5h/dia

DELIVERABLE:
  ✓ Scraper 3+ fontes (Google Maps, Facebook, CNPJ)
  ✓ Dashboard com filtros, paginação, export
  ✓ Integração WhatsApp (Twilio)
  ✓ Sistema de vendas básico
  ✓ Pronto para começar a prospectar & vender

CUSTO:
  • Stack: R$ 0 (open source)
  • Railway: R$ 0-100/mês (free tier)
  • Twilio: R$ 0 (sandbox), depois pago
  • Horas: ~270h (seu investimento)
```

---

**Documento gerado:** 2026-02-26
**Analista:** Atlas (Business Analyst - AIOS)
**Status:** ✅ Completo e pronto para implementação

---

## 📎 APÊNDICES

### A. Referências úteis

- FastAPI docs: https://fastapi.tiangolo.com/
- Puppeteer docs: https://pptr.dev/
- Electron docs: https://www.electronjs.org/docs
- Railway docs: https://docs.railway.app/
- Twilio WhatsApp: https://www.twilio.com/docs/whatsapp

### B. Estrutura final de pastas

Veja a próxima seção para estrutura completa de diretórios.

### C. Próximas documentações

- SETUP.md (como começar)
- API.md (endpoints detalhados)
- USER_GUIDE.md (como usar o app)
- DEPLOYMENT.md (como fazer deploy)
