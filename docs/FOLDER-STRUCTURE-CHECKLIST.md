# 📁 ESTRUTURA DE PASTAS + CHECKLIST IMPLEMENTAÇÃO

**Data:** 26 de Fevereiro de 2026
**Versão:** 1.0

---

## ESTRUTURA DE PASTAS FINAL

```
projeto-prospeccao-vans/
│
├─ docs/                                    # Documentação
│  ├─ ANALYSIS-OSINT-MVP-COMPLETE.md       # Este documento (análise completa)
│  ├─ SETUP.md                             # Setup local
│  ├─ API.md                               # Documentação API
│  ├─ USER_GUIDE.md                        # Guia do usuário
│  └─ DEPLOYMENT.md                        # Deploy production
│
├─ backend/                                 # FastAPI + Python
│  ├─ app/
│  │  ├─ __init__.py
│  │  ├─ main.py                           # FastAPI app (router principal)
│  │  ├─ models.py                         # SQLAlchemy ORM models
│  │  ├─ schemas.py                        # Pydantic schemas (validation)
│  │  ├─ database.py                       # Database connection
│  │  ├─ config.py                         # Configurações (env vars)
│  │  │
│  │  ├─ routes/                           # API routes (endpoints)
│  │  │  ├─ __init__.py
│  │  │  ├─ leads.py                       # CRUD leads
│  │  │  ├─ scraper.py                     # Scraper API
│  │  │  ├─ whatsapp.py                    # WhatsApp API
│  │  │  ├─ conversations.py               # Vendas / conversas
│  │  │  └─ auth.py                        # Autenticação
│  │  │
│  │  ├─ services/                         # Lógica de negócio
│  │  │  ├─ __init__.py
│  │  │  ├─ deduplicator.py               # Lógica deduplicação
│  │  │  ├─ validator.py                  # Validação leads
│  │  │  └─ whatsapp_service.py           # Lógica WhatsApp
│  │  │
│  │  └─ migrations/                       # Alembic migrations
│  │     ├─ env.py
│  │     ├─ script.py.mako
│  │     └─ versions/
│  │
│  ├─ requirements.txt                     # Python dependencies
│  ├─ Dockerfile                           # Containerização
│  ├─ .env.example                         # Exemplo de env vars
│  └─ README.md
│
├─ scraper/                                 # Node.js Puppeteer
│  ├─ src/
│  │  ├─ index.js                         # Entry point
│  │  ├─ config.js                        # Configurações
│  │  │
│  │  ├─ scrapers/
│  │  │  ├─ google-maps.js               # Google Maps scraper
│  │  │  ├─ facebook-groups.js           # Facebook scraper
│  │  │  └─ cnpj-lookup.js               # CNPJ scraper
│  │  │
│  │  ├─ utils/
│  │  │  ├─ api-client.js                # Chamadas para backend
│  │  │  ├─ logger.js                    # Logging
│  │  │  └─ helpers.js                   # Funções auxiliares
│  │  │
│  │  └─ data/
│  │     ├─ facebook_groups.json         # Lista de grupos Facebook
│  │     └─ sample_leads.json            # Dados de teste
│  │
│  ├─ package.json
│  ├─ .env.example
│  ├─ Dockerfile
│  └─ README.md
│
├─ frontend/                                # Electron + React
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ Dashboard.tsx                 # Dashboard principal
│  │  │  ├─ LeadList.tsx                  # Lista de leads
│  │  │  ├─ LeadDetail.tsx                # Detalhe de lead
│  │  │  ├─ ScraperConfig.tsx             # Config do scraper
│  │  │  ├─ Conversations.tsx             # Tela de vendas
│  │  │  ├─ Navbar.tsx                    # Navegação
│  │  │  └─ Layout.tsx                    # Layout wrapper
│  │  │
│  │  ├─ pages/
│  │  │  ├─ Home.tsx
│  │  │  ├─ Leads.tsx
│  │  │  ├─ Sales.tsx
│  │  │  ├─ Scraper.tsx
│  │  │  └─ Settings.tsx
│  │  │
│  │  ├─ services/
│  │  │  ├─ api.ts                       # Axios config + HTTP client
│  │  │  └─ electron.ts                  # IPC com Electron main
│  │  │
│  │  ├─ types/
│  │  │  └─ index.ts                     # TypeScript interfaces
│  │  │
│  │  ├─ App.tsx                          # App wrapper
│  │  ├─ index.css                        # Global styles
│  │  └─ main.tsx                         # React entry point
│  │
│  ├─ electron/
│  │  └─ main.ts                          # Electron main process
│  │
│  ├─ public/
│  │  ├─ index.html
│  │  ├─ favicon.ico
│  │  └─ assets/                          # Images, icons
│  │
│  ├─ package.json
│  ├─ tailwind.config.js
│  ├─ tsconfig.json
│  ├─ vite.config.ts
│  ├─ .env.example
│  └─ README.md
│
├─ docker-compose.yml                      # Orquestração local
├─ .gitignore
├─ README.md                               # Documentação principal
└─ CHANGELOG.md                            # Histórico de versões
```

---

## CHECKLIST PRE-DESENVOLVIMENTO

### ✅ Requisitos de Sistema

```
[ ] Python 3.11+ instalado
    └─ Verificar: python --version

[ ] Node.js 18+ instalado
    └─ Verificar: node --version

[ ] PostgreSQL 15+ (via Docker)
    └─ docker run -d --name postgres \
       -e POSTGRES_PASSWORD=postgres \
       -p 5432:5432 postgres

[ ] Redis 7+ (via Docker)
    └─ docker run -d --name redis \
       -p 6379:6379 redis

[ ] Git instalado
    └─ Verificar: git --version

[ ] Docker + Docker Compose
    └─ Verificar: docker --version && docker-compose --version
```

### ✅ Contas & Configurações

```
[ ] GitHub account
    └─ Criar repo privado

[ ] Twilio account (WhatsApp)
    └─ https://www.twilio.com/console
    └─ Copiar: Account SID, Auth Token

[ ] Google Maps API key (opcional)
    └─ https://cloud.google.com/maps/platform
    └─ Habilitar: Maps API, Places API

[ ] BrasilAPI ou CNPJ.info account
    └─ Para lookup de CNPJ

[ ] Railway account (deploy)
    └─ https://railway.app
```

### ✅ Ambiente Local

```
[ ] Clonar repo
    └─ git clone <repo>
    └─ cd projeto-prospeccao-vans

[ ] Criar .env files
    └─ backend/.env (copiar de .env.example)
    └─ scraper/.env (copiar de .env.example)
    └─ frontend/.env (copiar de .env.example)

[ ] Docker Compose up
    └─ docker-compose up -d
    └─ Verificar: docker-compose ps

[ ] PostgreSQL ready
    └─ docker exec -it postgres psql -U postgres
    └─ CREATE DATABASE prospeccao;

[ ] Redis ready
    └─ docker exec -it redis redis-cli ping
    └─ Resultado: PONG
```

---

## CHECKLIST SPRINT 1

### Dia 1-2: Setup Inicial

```
BACKEND SETUP:
[ ] Criar venv
    └─ python -m venv venv
    └─ source venv/bin/activate (Mac/Linux)
    └─ venv\Scripts\activate (Windows)

[ ] Instalar dependências
    └─ pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic

[ ] Criar app/main.py
    └─ FastAPI hello world

[ ] Testar
    └─ uvicorn app.main:app --reload
    └─ http://localhost:8000/docs

SCRAPER SETUP:
[ ] Criar package.json
    └─ npm init -y

[ ] Instalar dependências
    └─ npm install puppeteer puppeteer-extra cheerio got dotenv

[ ] Criar src/index.js
    └─ Hello world script

FRONTEND SETUP:
[ ] Criar app Electron
    └─ npx create-electron-app frontend --template=webpack

[ ] Instalar React
    └─ npm install react react-dom

[ ] Instalar TailwindCSS
    └─ npm install -D tailwindcss postcss autoprefixer

[ ] Testar
    └─ npm start (Electron app abre)
```

### Dia 3-4: Database + API CRUD

```
ALEMBIC MIGRATIONS:
[ ] Iniciar Alembic
    └─ alembic init alembic

[ ] Criar models.py
    └─ User, Lead, ScrapeJob

[ ] Gerar migration
    └─ alembic revision --autogenerate -m "initial"

[ ] Aplicar migration
    └─ alembic upgrade head

[ ] Verificar tabelas
    └─ \dt (no psql)

FASTAPI ROUTES:
[ ] POST /leads
    └─ Criar lead
    └─ Validar: phone, email
    └─ Salvar em DB

[ ] GET /leads
    └─ Listar todos
    └─ Query params: city, source, limit, offset

[ ] GET /leads/{id}
    └─ Detalhes de 1 lead

[ ] PUT /leads/{id}
    └─ Editar lead

[ ] DELETE /leads/{id}
    └─ Deletar lead

TESTES:
[ ] Usar Insomnia ou Postman
    └─ Criar 10 leads manuais
    └─ Listar
    └─ Editar
    └─ Deletar
```

### Dia 5-8: Google Maps Scraper

```
PUPPETEER SCRIPT:
[ ] Criar src/scrapers/google-maps.js
    └─ Função: scrapeGoogleMaps(city, keyword)

[ ] Navegar para Google Maps
    └─ browser.goto('https://maps.google.com')

[ ] Buscar
    └─ page.type('input[role="searchbox"]', "transporte escolar São Paulo")
    └─ page.press('Enter')

[ ] Aguardar resultados
    └─ page.waitForSelector('[role="listbox"]')

[ ] Extrair resultados
    └─ Loop: 30 primeiros resultados
    └─ Extrair: name, phone, address, url, rating

[ ] Salvar JSON
    └─ Escrever em arquivo ou stdout

[ ] Tratamento de erros
    └─ Try-catch
    └─ Retry com delay
    └─ Proxy se bloqueado

INTEGRAÇÃO:
[ ] Chamar endpoint POST /leads
    └─ Para cada lead, enviar para backend
    └─ Backend: dedup básica + salva

TESTES:
[ ] Rodar em 1 cidade (São Paulo)
    └─ node src/index.js --city="São Paulo" --source="google_maps"
    └─ Coletar 50-100 leads
    └─ Verificar em http://localhost:8000/docs/
```

---

## CHECKLIST SPRINT 2

### Dia 1-4: Facebook Groups

```
IDENTIFICAR GRUPOS:
[ ] Google search
    └─ site:facebook.com "transporte escolar"
    └─ Listar top 15 grupos

[ ] Salvar em data/facebook_groups.json
    └─ {name, url, members}

SCRAPER FACEBOOK:
[ ] Criar src/scrapers/facebook-groups.js
    └─ Função: scrapeFacebookGroups(groups)

[ ] Puppeteer + Login (ou público)
    └─ Entrar em cada grupo
    └─ Buscar posts (últimos 30 dias)

[ ] Extrair dados
    └─ Nome autor
    └─ Texto post
    └─ Regex: /(\d{2})\s?(\d{4,5})-?(\d{4})/g (telefone)
    └─ Regex: /[\w\.-]+@[\w\.-]+\.\w+/ (email)

[ ] Validação
    └─ É transporte escolar? (keywords no texto)
    └─ Telefone válido?

[ ] Salvar
    └─ facebook_leads.json

INTEGRAÇÃO + TESTES:
[ ] Enviar para backend
    └─ POST /leads (batch)

[ ] Verificar em DB
    └─ SELECT COUNT(*) FROM leads WHERE source='facebook';
```

### Dia 5-8: CNPJ Lookup

```
CNPJ API:
[ ] Registrar em BrasilAPI
    └─ https://brasilapi.com.br/

[ ] Criar src/scrapers/cnpj-lookup.js
    └─ Função: lookupCNPJ(cnpj)

[ ] Chamar API
    └─ GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}
    └─ Extrair: razão social, telefone, email, endereço

[ ] Filtrar
    └─ Atividade = "transporte"
    └─ Status = "ativo"

[ ] Salvar
    └─ cnpj_leads.json

DEDUPLICAÇÃO:
[ ] Criar backend/services/deduplicator.py
    └─ Função: deduplicate_leads()

[ ] Algoritmos:
    └─ Phone matching (exato)
    └─ Fuzzy name (Levenshtein >= 85%)
    └─ Fuzzy address (>= 80%)

[ ] Implementar
    └─ pip install fuzzywuzzy python-Levenshtein
    └─ Testar com 5K leads

[ ] Resultado
    └─ 5K-8K leads únicos em DB
```

---

## CHECKLIST SPRINT 3

### Dia 1-3: Frontend Setup

```
REACT + TAILWIND:
[ ] Setup React
    └─ npm create vite@latest frontend -- --template react
    └─ cd frontend && npm install

[ ] Instalar dependências
    └─ npm install axios react-router-dom chart.js react-chartjs-2
    └─ npm install -D tailwindcss postcss autoprefixer

[ ] Configurar Tailwind
    └─ npx tailwindcss init -p

[ ] Configurar Axios
    └─ src/services/api.ts (baseURL, interceptors)

[ ] Testar
    └─ npm run dev
    └─ http://localhost:5173

ELECTRON:
[ ] Setup Electron
    └─ npm install electron --save-dev
    └─ npm install electron-builder --save-dev

[ ] Criar electron/main.ts
    └─ Abrir janela React
    └─ IPC com renderer

[ ] Testar
    └─ npm run electron-dev
```

### Dia 4-6: Telas Principais

```
DASHBOARD (src/pages/Home.tsx):
[ ] Cards com métricas
    └─ Total leads
    └─ Leads para contatar
    └─ Taxa de resposta

[ ] Gráfico pie
    └─ Leads por fonte

[ ] Botão "Novo Scrape"

LISTA DE LEADS (src/pages/Leads.tsx):
[ ] Tabela
    └─ Colunas: nome, tel, endereço, fonte, status, ações

[ ] Filtros
    └─ Por fonte, status, data

[ ] Busca
    └─ Buscar por nome (live search)

[ ] Paginação
    └─ 20 por página

[ ] Export CSV
    └─ Botão para baixar CSV

DETALHE LEAD (src/components/LeadDetail.tsx):
[ ] Dados completos
[ ] Histórico contato
[ ] Campo notas
[ ] Status (dropdown)
[ ] Botão WhatsApp

SCRAPER CONFIG (src/pages/Scraper.tsx):
[ ] Dropdown fonte
    └─ Google Maps, Facebook, CNPJ

[ ] Multi-select cidades
    └─ SP, Rio, BH, etc

[ ] Input keywords
[ ] Botão "Executar"
[ ] Status live

API INTEGRATION:
[ ] Testar GET /leads
    └─ Listar em tabela

[ ] Testar POST /leads
    └─ Criar via formulário

[ ] Testar DELETE /leads/{id}
```

---

## CHECKLIST SPRINT 4

### Dia 1-3: Twilio WhatsApp

```
TWILIO SETUP:
[ ] Criar conta
    └─ https://www.twilio.com/console

[ ] Copiar credenciais
    └─ Account SID
    └─ Auth Token
    └─ Adicionar em .env (backend)

[ ] Setup WhatsApp Sandbox
    └─ WhatsApp > Sandbox
    └─ Copiar número Twilio
    └─ Scannear QR code (WhatsApp pessoal)

BACKEND INTEGRATION:
[ ] Instalar SDK
    └─ pip install twilio

[ ] Criar app/routes/whatsapp.py
    └─ POST /whatsapp/send
    └─ POST /whatsapp/webhook (receber)
    └─ GET /whatsapp/conversations/{lead_id}

[ ] Função send_message
    └─ Validar telefone
    └─ Enviar via Twilio
    └─ Log em DB

[ ] Webhook
    └─ Receber respostas
    └─ Salvar em conversations table

TESTES:
[ ] Enviar 5 mensagens
    └─ Verificar chegada em WhatsApp pessoal

[ ] Responder
    └─ Verificar recebimento no app
```

### Dia 4-6: Sistema Vendas

```
DATABASE:
[ ] Criar conversations table
    └─ id, lead_id, status, notes, assigned_to
    └─ messages (JSON array)

BACKEND ROUTES:
[ ] GET /conversations
    └─ Listar conversas ativas

[ ] GET /conversations/{lead_id}
    └─ Histórico com 1 lead

[ ] POST /conversations/{lead_id}/message
    └─ Enviar mensagem

[ ] PUT /conversations/{lead_id}/status
    └─ Atualizar status (novo, em andamento, convertido)

FRONTEND:
[ ] Tela Conversations (src/pages/Sales.tsx)
    └─ Lista conversas (sidebar)
    └─ Chat box (main)

[ ] Chat box
    └─ Histórico de mensagens
    └─ Input para digitar
    └─ Botão enviar
    └─ Status (entregue, lido)

[ ] Info lead
    └─ Nome, tel, empresa

[ ] Notas
    └─ Campo editável

[ ] Templates
    └─ Dropdown: selecionar template
    └─ Placeholder: {nome}, {empresa}

TESTES:
[ ] Enviar mensagem
    └─ Verificar em DB

[ ] Receber resposta
    └─ Verificar em chat

[ ] Editar status
    └─ Mudar para "convertido"
```

---

## CHECKLIST SPRINT 5

### Dia 1-3: Testes

```
TESTES FUNCIONAIS:

Scraper:
[ ] Google Maps
    └─ 50 leads coletados
    └─ Validação OK

[ ] Facebook
    └─ 30 leads
    └─ Telefones corretos

[ ] CNPJ
    └─ 20 leads
    └─ Deduplica OK

Dashboard:
[ ] Listar 1K leads
    └─ Tempo < 3s

[ ] Filtrar
    └─ Tempo < 1s

[ ] Paginação
    └─ Suave

WhatsApp:
[ ] Enviar mensagem
[ ] Receber resposta
[ ] Log em conversas
[ ] Status atualiza

Geral:
[ ] Telefone inválido
    └─ Validação rejeita

[ ] Lead sem email
    └─ Não quebra app

[ ] Scraper offline
    └─ Erro tratado gracefully
```

### Dia 4-5: Deploy

```
DOCKER:
[ ] Dockerfile (backend)
    └─ FROM python:3.11
    └─ COPY requirements.txt
    └─ pip install
    └─ CMD uvicorn

[ ] Dockerfile (scraper)
    └─ FROM node:18
    └─ COPY package.json
    └─ npm install
    └─ CMD node src/index.js

[ ] docker-compose.yml
    └─ postgres
    └─ redis
    └─ backend
    └─ scraper
    └─ Testar: docker-compose up

RAILWAY:
[ ] Criar projeto
    └─ https://railway.app

[ ] Connect GitHub
    └─ Selecionar repo

[ ] Deploy backend
    └─ Adicionar Dockerfile
    └─ Setup env vars
    └─ Deploy

[ ] Deploy scraper
    └─ Mesmo processo

[ ] Testar
    └─ GET /api/leads
    └─ Deve funcionar

ELECTRON BUILD:
[ ] npm run build
    └─ electron-builder
    └─ Gerar .exe ou .dmg
    └─ Verificar instalador
```

### Dia 6-8: Documentação

```
README.md:
[ ] Visão geral
[ ] Features
[ ] Tech stack
[ ] Screenshots (opcional)
[ ] Como instalar
[ ] Como rodar

SETUP.md:
[ ] Requisitos
[ ] Passo a passo
[ ] Variáveis ambiente
[ ] Troubleshooting

API.md:
[ ] Documentação endpoints
[ ] Parâmetros
[ ] Exemplos de request/response
[ ] (FastAPI Swagger automático)

USER_GUIDE.md:
[ ] Dashboard
[ ] Scraper
[ ] Vendas
[ ] WhatsApp
[ ] Troubleshooting

DEPLOYMENT.md:
[ ] Setup local
[ ] Deploy Railway
[ ] Build Electron
[ ] CI/CD
```

---

## CHECKLIST FINAL (PRÉ-LAUNCH)

```
CODE QUALITY:
[ ] Sem erros de linting
    └─ pylint (Python)
    └─ eslint (JavaScript/TypeScript)

[ ] Type checking OK
    └─ mypy (Python)
    └─ tsc (TypeScript)

[ ] Testes passando
    └─ pytest (backend)
    └─ jest (frontend)

SEGURANÇA:
[ ] Senhas hashadas
    └─ bcrypt (backend)

[ ] API keys em .env
    └─ Não commitar em git

[ ] HTTPS em produção
    └─ Railway automático

[ ] SQL injection prevention
    └─ SQLAlchemy ORM (não raw SQL)

[ ] XSS prevention
    └─ React escapa HTML

PERFORMANCE:
[ ] Dashboard <3s com 10K leads
[ ] Filtros <1s
[ ] Scraper não trava
[ ] Deduplica <5min (5K leads)

DOCUMENTAÇÃO:
[ ] README completo
[ ] API docs
[ ] User guide
[ ] Setup.md
[ ] Deployment.md

DEPLOY:
[ ] Backend em Railway
[ ] Scraper em Railway
[ ] Database migrada
[ ] Redis funcionando
[ ] Secrets configurados
[ ] Testes em produção OK
```

---

## TEMPO ESTIMADO POR TASK

```
SPRINT 1: 40-50h
├─ Setup: 8h
├─ Backend API: 12h
└─ Google Maps Scraper: 20h

SPRINT 2: 50-60h
├─ Facebook Scraper: 12h
├─ CNPJ Lookup: 15h
└─ Deduplicação: 10h

SPRINT 3: 50-60h
├─ Frontend Setup: 12h
├─ Telas principais: 18h
└─ Integração API: 10h

SPRINT 4: 40-50h
├─ Twilio Setup: 12h
├─ Sistema Vendas: 14h
└─ Templates: 8h

SPRINT 5: 30-40h
├─ Testes: 10h
├─ Deploy: 10h
└─ Documentação: 10h

TOTAL: 210-260 horas
```

---

## 🚀 COMEÇAR AGORA

### Passo 1: Setup (Dia 1)
```bash
# Clone repo
git clone <seu-repo> && cd projeto-prospeccao-vans

# Criar .env files
cp backend/.env.example backend/.env
cp scraper/.env.example scraper/.env
cp frontend/.env.example frontend/.env

# Docker up
docker-compose up -d

# Verificar
docker-compose ps
```

### Passo 2: Backend (Dia 2)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Passo 3: Scraper (Dia 3)
```bash
cd scraper
npm install
node src/index.js --city="São Paulo" --source="google_maps"
```

### Passo 4: Frontend (Dia 4)
```bash
cd frontend
npm install
npm run dev
```

### Passo 5: Testar (Dia 5)
```bash
# Abrir http://localhost:8000/docs (Swagger)
# Abrir http://localhost:5173 (React)
# Criar alguns leads manuais
# Rodar scraper
```

---

**✅ PRONTO PARA COMEÇAR!**

Qual sprint quer iniciar primeiro?
