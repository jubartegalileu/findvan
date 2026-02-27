# 🕷️ Module 1: Scraper — OSINT Lead Generation

**Automated web scraper for collecting school transportation business leads from 5 sources**

> Status: 📋 Ready for Implementation (Sprint 1)
> Target: 100+ leads in < 5 minutes

---

## 📊 Module Overview

This module automates lead collection from:

| Source | Volume | Priority | Implementation |
|--------|--------|----------|-----------------|
| Google Maps | 2K-4K/mo | CRÍTICA | Sprint 1 |
| Facebook Groups | 1K-2K/mo | CRÍTICA | Sprint 2 |
| CNPJ Lookup | 1K-2K/mo | CRÍTICA | Sprint 2 |
| OLX/Marketplace | 0.5K-1K/mo | ALTA | Sprint 3 |
| LinkedIn | 0.5K-1K/mo | ALTA | Sprint 3 |

**Total:** 5K-9K leads/month

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd packages/scraper
npm install
```

### 2. Run Google Maps Scraper (Sprint 1)

```bash
# Single city (São Paulo)
npm run scraper:google-maps

# Output: data/raw-leads/{date}-google-maps.json
```

### 3. Validate Output

```bash
# Check generated leads
cat ../backend/data/raw-leads/2026-02-27-google-maps.json | head -50

# Count total leads
wsl jq length data/raw-leads/2026-02-27-google-maps.json
```

---

## 📁 File Structure

```
packages/scraper/
├── src/
│   ├── scrapers/
│   │   ├── google-maps.js      # Sprint 1: Main scraper
│   │   ├── facebook.js         # Sprint 2
│   │   ├── cnpj-lookup.js      # Sprint 2
│   │   ├── olx.js              # Sprint 3
│   │   └── linkedin.js         # Sprint 3
│   │
│   ├── validators/
│   │   ├── lead-validator.js   # Validation logic
│   │   └── deduplicator.js     # Dup detection
│   │
│   └── index.js                # Main entry point
│
├── tests/
│   ├── scrapers/
│   └── validators/
│
├── logs/                        # Scraper logs
├── package.json
└── README.md
```

---

## 🔍 Google Maps Scraper (Sprint 1)

### How It Works

```
1. Load Google Maps
2. Search for "transporte escolar" + city
3. Extract results: name, phone, address, URL
4. Validate data (phone format, address not empty)
5. Save to JSON
6. Deduplicate (same phone = duplicate)
7. Log results
```

### Input

```javascript
{
  city: "São Paulo",
  keyword: "transporte escolar",
  resultsPerPage: 100,
  maxPages: 5,
  proxyUrl: null,
  headless: true
}
```

### Output

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

---

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test
npm test -- tests/scrapers/google-maps.test.js

# Watch mode
npm test -- --watch
```

### Manual Testing

```bash
# Test validator alone
npm run test -- tests/validators/lead-validator.test.js

# Test scraper with mock data
node src/scrapers/google-maps.js --mock
```

---

## 🔧 Configuration

### Environment Variables

```bash
# .env.local
PUPPETEER_HEADLESS=true
PUPPETEER_SKIP_DOWNLOAD=false
SCRAPER_DELAY_MS=1000
SCRAPER_TIMEOUT_MS=30000
SCRAPER_RETRY_COUNT=3
SCRAPER_LOG_LEVEL=info

# Optional proxy
USE_PROXY=false
PROXY_URL=
```

### Puppeteer Options

```javascript
// packages/scraper/src/config/browser.js
{
  headless: true,          // Don't show browser
  timeout: 30000,          // 30s per page
  delay: 1000,             // 1s between requests
  retries: 3,              // Retry failed requests
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}
```

---

## 📊 Acceptance Criteria (Sprint 1)

- [ ] Scraper CLI runs: `npm run scraper:google-maps`
- [ ] Generates file: `./data/raw-leads/{date}-google-maps.json`
- [ ] Contains 100+ valid leads
- [ ] Validates phone (11 digits BR format)
- [ ] Validates address (non-empty)
- [ ] Zero critical errors (warnings ok)
- [ ] Logs structured in `./logs/scraper-{date}.log`
- [ ] Unit tests pass (80%+ coverage)
- [ ] README updated with how to run manually

---

## 🚨 Known Issues & Solutions

### Google Maps blocks requests

**Issue:** 429 (Too Many Requests)

**Solution:**
1. Increase `SCRAPER_DELAY_MS` (e.g., 5000)
2. Use proxy (set `USE_PROXY=true` + `PROXY_URL`)
3. Reduce `resultsPerPage` (100 → 50)

### Puppeteer crashes

**Issue:** "Failed to launch browser"

**Solution:**
```bash
# Reinstall Chromium
npm run install-chromium

# Or use system Chrome
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
npm run scraper:google-maps
```

### No results found

**Issue:** 0 leads captured

**Solution:**
1. Verify keyword (e.g., "transporte escolar")
2. Verify city name (use Portuguese)
3. Run with `--debug` to see HTML
4. Check if Google Maps is returning results manually

---

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Leads/minute | 20 | - |
| Success rate | 95% | - |
| Average time | <5 min/100 leads | - |
| Memory usage | <500MB | - |
| CPU usage | <30% | - |

---

## 🔐 Security

- ✅ No API keys exposed (uses web scraping, not API)
- ✅ User-Agent spoofing (appears as regular browser)
- ✅ Rate limiting (delay between requests)
- ✅ Proxy support (if needed)
- ✅ No passwords stored

---

## 📝 Development Notes

### Why Google Maps First?

1. Largest volume (2K-4K leads/month)
2. Least legal restrictions
3. Data is already public
4. Easiest to scrape (well-structured HTML)

### Why Puppeteer?

1. Full browser automation
2. Handles dynamic content (maps)
3. Easy to use + well documented
4. Good error handling

### Why JSON Before Database?

1. Independent validation
2. Easy debugging
3. Decoupled from Module 2 (Database)
4. Can review/clean data manually

---

## 🎯 Next Steps

**When Sprint 1 is 100% complete:**

1. ✅ 100+ leads captured and validated
2. ✅ All tests passing
3. ✅ Zero critical errors
4. ✅ You + Sócio manually verify 10 leads

**Then: Move to Module 2 (Database)**

---

**Version:** 1.0.0
**Sprint:** 1 (Semanas 1-2)
**Owner:** Dex (@dev)

