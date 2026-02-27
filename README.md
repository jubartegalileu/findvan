# 🚀 FindVan — OSINT + SDR para Prospecção de Vans Escolares

**Aplicativo Desktop para coleta automatizada de leads e prospecção via SDR + WhatsApp**

> Status: 🟢 Setup Técnico Completo | Pronto para Sprint 1

---

## 📋 Visão Geral

**FindVan** é um aplicativo Desktop (Electron) que automatiza a prospecção de vans escolares através de:

1. **Scraper OSINT** — Coleta automatizada de 5K-9K leads/mês via:
   - Google Maps
   - Facebook Groups
   - CNPJ Lookup
   - OLX/Marketplace
   - LinkedIn

2. **Database** — Persistência em PostgreSQL com deduplicação

3. **Dashboard SDR** — Interface visual para prospecção e CRM

4. **WhatsApp Integration** — Disparo automatizado/manual com histórico

**Mercado:** R$ 63M-109M TAM | R$ 300K-1.2M SAM Fase 1 | 5-10K leads/mês

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  ELECTRON + REACT DASHBOARD (Frontend)                   │
│  TailwindCSS | Chart.js | React Router                  │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│  FASTAPI (Backend) - Python 3.11                        │
│  SQLAlchemy | Pydantic | Celery                         │
└─────────────────────────────────────────────────────────┘
                          ↓ SQL
┌─────────────────────────────────────────────────────────┐
│  PostgreSQL 15 | Redis 7 (Cache/Queue)                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  PUPPETEER SCRAPER (Node.js 18) - Background Worker    │
│  Google Maps | Facebook | CNPJ | OLX | LinkedIn        │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Roadmap: 4 Módulos Sequenciais (8-10 semanas)

| Sprint | Módulo | Deliverable | Status |
|--------|--------|-------------|--------|
| 1-2 | **Scraper** | 100+ leads capturados | 📋 Plan |
| 3-4 | **Database** | 95+ leads únicos em BD | 📋 Plan |
| 5-6 | **Dashboard** | UI funcional para SDR | 📋 Plan |
| 7-8 | **WhatsApp** | Integração + histórico | 📋 Plan |
| 9-10 | **Deploy** | Testes + Railway | 📋 Plan |

**Documentação completa:** [PRD-MODULES.md](docs/PRD-MODULES.md)

---

## 🚀 Quick Start

### 1️⃣ Setup Inicial (5 minutos)

```bash
# Clone / navigate to project
cd /Users/flaviogoncalvesjr/Code/findvan

# Install dependencies (Node.js + Python)
npm run setup

# Start Docker services (PostgreSQL + Redis)
npm run docker:up
```

### 2️⃣ Verificar Setup

```bash
# Check services
docker ps

# Verify PostgreSQL
psql -h localhost -U findvan -d findvan_db -c "SELECT version();"

# Verify Redis
redis-cli ping
```

### 3️⃣ Começar Desenvolvimento

```bash
# Terminal 1: Backend (Python)
npm run dev:backend

# Terminal 2: Scraper (Node.js)
npm run dev:scraper

# Terminal 3: Dashboard (Electron + React)
npm run dev:dashboard
```

---

## 📁 Estrutura de Pastas

```
findvan/
├── packages/
│   ├── scraper/          # Module 1: Google Maps + OSINT Scraper
│   │   ├── src/
│   │   │   ├── scrapers/
│   │   │   ├── validators/
│   │   │   └── index.js
│   │   └── package.json
│   │
│   ├── backend/          # Module 2: FastAPI + Database
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── models/
│   │   │   └── main.py
│   │   ├── migrations/
│   │   └── requirements.txt
│   │
│   └── dashboard/        # Module 3: Electron + React
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── main.js
│       └── package.json
│
├── .docker/
│   └── docker-compose.yml
│
├── config/
│   ├── database/
│   └── docker/
│
├── data/
│   └── raw-leads/        # Scraper output (Module 1)
│
├── docs/
│   ├── PRD-MODULES.md    # 📋 Seu guia de implementação
│   ├── ANALYSIS-OSINT-MVP-COMPLETE.md
│   └── modules/          # Module-specific docs
│
├── logs/
├── .env.findvan.example
└── package.json          # Root monorepo config
```

---

## 🔧 Comandos Principais

### Development

```bash
# Start all services
npm run dev

# Start individual services
npm run dev:scraper
npm run dev:backend
npm run dev:dashboard

# Run scraper manually
npm run scraper:google-maps
npm run scraper:facebook
npm run scraper:cnpj
```

### Testing & Quality

```bash
# Run all tests
npm run test

# Run tests for specific module
npm run test:scraper
npm run test:backend
npm run test:dashboard

# Lint code
npm run lint

# Type checking
npm run typecheck
```

### Docker

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# View logs
npm run docker:logs
```

### Database

```bash
# Access PostgreSQL
psql -h localhost -U findvan -d findvan_db

# Access PgAdmin UI
# Browser: http://localhost:5050
# Email: admin@findvan.local
# Password: admin
```

---

## 📊 Module Status

### Module 1: Scraper 🔄
- **Status:** Ready for implementation (Sprint 1)
- **Target:** 100+ leads em 1 semana
- **Tech:** Puppeteer, Cheerio, Got
- **Files:** `packages/scraper/`
- **Next:** Run `*develop module-1-scraper` when ready

### Module 2: Database ⏳
- **Status:** Blocked (depends on Module 1)
- **Target:** 95+ unique leads in PostgreSQL
- **Tech:** FastAPI, SQLAlchemy, Alembic
- **Files:** `packages/backend/`

### Module 3: Dashboard ⏳
- **Status:** Blocked (depends on Module 2)
- **Target:** Functional UI for SDR
- **Tech:** Electron, React, TailwindCSS
- **Files:** `packages/dashboard/`

### Module 4: WhatsApp ⏳
- **Status:** Blocked (depends on Module 3)
- **Target:** 20+ messages sent successfully
- **Tech:** Twilio, WhatsApp Business API
- **Integration:** Backend module

---

## 🛠️ Environment Variables

Copy `.env.findvan.example` to `.env.local` and fill in your values:

```bash
cp .env.findvan.example .env.local
```

**Key variables:**

```
DATABASE_URL=postgresql://findvan:findvan_password@localhost:5432/findvan_db
REDIS_URL=redis://localhost:6379/0
BACKEND_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
```

---

## 📚 Documentation

- **[PRD-MODULES.md](docs/PRD-MODULES.md)** — Complete module specification
- **[ANALYSIS-OSINT-MVP-COMPLETE.md](docs/ANALYSIS-OSINT-MVP-COMPLETE.md)** — Market analysis & OSINT strategy
- **[FOLDER-STRUCTURE-CHECKLIST.md](docs/FOLDER-STRUCTURE-CHECKLIST.md)** — Sprint checklist

---

## 🐛 Troubleshooting

### Docker PostgreSQL not connecting

```bash
# Check if container is running
docker ps | grep postgres

# Check logs
docker logs findvan-postgres

# Restart
docker-compose -f .docker/docker-compose.yml restart postgres
```

### Node modules issues

```bash
# Clean install
npm run clean
npm install
```

### Python venv not activating

```bash
# Manual activation
cd packages/backend
source venv/bin/activate
pip install -r requirements.txt
```

---

## 🤝 Contributing

Development follows **Story-Driven Development** with AIOS:

1. **Create story** (via @sm — River)
2. **Implement** (via @dev — Dex)
3. **Test & validate** (via @qa — Quinn)
4. **Push** (via @devops — Gage)

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for framework details.

---

## 📝 License

MIT License — You + Sócio

---

## 📞 Support

- **Technical questions:** Check [PRD-MODULES.md](docs/PRD-MODULES.md) first
- **Setup issues:** Review Troubleshooting section above
- **Feature requests:** Create a story in docs/stories/

---

**Version:** 1.0.0
**Setup Date:** 2026-02-27
**Status:** 🟢 Technical Setup Complete — Ready for Sprint 1

