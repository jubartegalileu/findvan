# Database Setup — Module 2

## Overview

Module 2 implements a PostgreSQL database layer for persisting leads scraped from Module 1 (OSINT Scraper).

**Database Goal:** 100% of scraped leads stored, deduplicated, and queryable.

---

## Architecture

### Database Schema

```
leads TABLE (15 columns)
├── id (BIGSERIAL PRIMARY KEY)
├── source (TEXT) - Origin of lead
├── name (TEXT) - Business/contact name
├── phone (VARCHAR(15)) - 11-digit Brazilian format
├── email (VARCHAR(255)) - Optional email
├── address (TEXT) - Full address
├── city (TEXT) - City name
├── company_name (TEXT) - Company name
├── cnpj (VARCHAR(20)) - Brazilian company ID
├── url (TEXT) - Website or Google Maps URL
├── captured_at (TIMESTAMP) - When lead was scraped
├── is_valid (BOOLEAN) - Passed validation
├── is_duplicate (BOOLEAN) - Marked as duplicate
├── created_at (TIMESTAMP) - Record creation
└── updated_at (TIMESTAMP) - Last update
```

### Constraints & Indexes

```sql
UNIQUE(phone, source)           -- Prevent duplicates
CHECK(phone IS NULL OR LEN=11)  -- Valid phone format

Indexes:
- idx_leads_phone               -- Phone lookups
- idx_leads_city                -- City queries
- idx_leads_source              -- Source filtering
- idx_leads_valid               -- Valid status
- idx_leads_created             -- Created timestamp
- idx_leads_phone_source        -- Composite for updates
- idx_leads_city_valid          -- City + valid filter
```

---

## Setup Instructions

### 1. PostgreSQL Installation

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
- Download installer from https://www.postgresql.org/download/windows/
- Use default settings (port 5432)

### 2. Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE findvan;
CREATE USER findvan WITH PASSWORD 'findvan_password';
ALTER ROLE findvan SET client_encoding TO 'utf8';
ALTER ROLE findvan SET default_transaction_isolation TO 'read committed';
ALTER ROLE findvan SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE findvan TO findvan;
\q
```

### 3. Environment Configuration

```bash
# Copy .env.example to .env
cp packages/backend/.env.example packages/backend/.env

# Edit .env with your PostgreSQL credentials
nano packages/backend/.env
```

**Required variables:**
```
DATABASE_URL=postgresql://findvan:findvan_password@localhost:5432/findvan
DB_HOST=localhost
DB_PORT=5432
DB_NAME=findvan
DB_USER=findvan
DB_PASSWORD=findvan_password
```

### 4. Run Migrations

```bash
cd packages/backend
npm run migrate
```

**Expected output:**
```
🔄 Starting database migrations...

📋 Running: 001-create-leads.sql
✅ 001-create-leads.sql completed

==================================================
📊 Migration Summary:
   ✅ Successful: 1
   ❌ Failed: 0
==================================================
```

---

## API Functions

### Insert Leads

```javascript
import { leadsService } from '../src/index.js';

const result = await leadsService.insertLeads([
  {
    name: 'Van Escolar ABC',
    phone: '11987654321',
    email: 'contato@van.com.br',
    address: 'Av. Paulista, 1000',
    city: 'São Paulo',
    company_name: 'Van Escolar ABC',
    is_valid: true
  }
], 'google_maps');

console.log(result);
// {
//   inserted: 1,
//   duplicate: 0,
//   errors: 0,
//   details: []
// }
```

### Query Functions

#### Get Leads by City
```javascript
const result = await leadsService.getLeadsByCity('São Paulo', 1, 10);
// {
//   leads: [...],
//   total: 245,
//   page: 1,
//   pages: 25,
//   limit: 10
// }
```

#### Get Lead by Phone
```javascript
const lead = await leadsService.getLeadByPhone('11987654321');
// { id: 1, name: '...', phone: '...', ... }
```

#### Get Leads by Source
```javascript
const leads = await leadsService.getLeadsBySource('google_maps', 100);
// [{ id: 1, ... }, { id: 2, ... }, ...]
```

#### Get Valid Leads
```javascript
const result = await leadsService.getValidLeads('São Paulo', 1, 10);
// { leads: [...], total: 200, page: 1, pages: 20, is_valid: true }
```

#### Get Duplicates
```javascript
const dups = await leadsService.getDuplicates();
// [
//   {
//     phone: '11987654321',
//     count: 3,
//     records: [
//       { id: 1, name: '...', source: '...' },
//       { id: 5, name: '...', source: '...' },
//       { id: 12, name: '...', source: '...' }
//     ]
//   }
// ]
```

#### Merge Duplicates
```javascript
const result = await leadsService.mergeDuplicates('11987654321', 1);
// { merged: 1, deleted: 2 }
```

#### Get Statistics
```javascript
const stats = await leadsService.getStats();
// {
//   total_leads: 1000,
//   sources: 3,
//   cities: 15,
//   valid_leads: 950,
//   duplicate_leads: 50,
//   unique_phones: 900
// }
```

---

## Testing

### Run All Tests

```bash
npm test:db
```

### Run Specific Test

```bash
npm test tests/db/leads-service.test.js
npm test tests/db/integration.test.js
```

### Run with Coverage

```bash
# This requires npm test to be enhanced
# For now, use basic npm test
```

---

## Integration: Module 1 → Module 2

### Full Pipeline

```javascript
import { scrapeGoogleMaps } from '../scraper/src/scrapers/google-maps-v2.js';
import { leadsService } from './src/index.js';

// Step 1: Scrape leads
const scrapeResult = await scrapeGoogleMaps({
  city: 'São Paulo',
  useMock: false  // Real scraping
});

// Step 2: Insert into database
const insertResult = await leadsService.insertLeads(
  scrapeResult.leads,
  'google_maps'
);

// Step 3: Query results
const stats = await leadsService.getStats();
console.log(`Stored ${stats.total_leads} leads`);
```

### Mock Data Testing

For development without real Google Maps:

```javascript
// Use mock mode from Module 1
const mockResult = await scrapeGoogleMaps({
  city: 'São Paulo',
  useMock: true  // Uses sample.html
});

// Insert mock data
const result = await leadsService.insertLeads(
  mockResult.leads,
  'google_maps'
);
```

---

## Database Monitoring

### Check Database Size

```sql
SELECT
  datname,
  pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname = 'findvan';
```

### View Leads Statistics

```sql
SELECT
  COUNT(*) as total,
  COUNT(DISTINCT source) as sources,
  COUNT(DISTINCT city) as cities,
  COUNT(CASE WHEN is_valid THEN 1 END) as valid,
  COUNT(CASE WHEN is_duplicate THEN 1 END) as duplicates
FROM leads;
```

### Find Duplicates

```sql
SELECT
  phone,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as names
FROM leads
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

---

## Troubleshooting

### Connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** PostgreSQL not running
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Password authentication failed

```
Error: password authentication failed for user "findvan"
```

**Solution:** Check .env file and PostgreSQL user password
```bash
# Reset password in PostgreSQL
psql -U postgres
ALTER USER findvan WITH PASSWORD 'new_password';
```

### Table already exists

```
Error: relation "leads" already exists
```

**Solution:** This is OK — migration checking for `IF NOT EXISTS`

### Port already in use

```
Error: listen EADDRINUSE: address already in use :::5432
```

**Solution:** PostgreSQL already running or use different port
```bash
# Kill existing connection
pkill -f postgres

# Or change DB_PORT in .env
```

---

## Performance Notes

- **Batch inserts:** Process leads in 1000-record batches
- **Connection pooling:** Min 2, Max 10 connections
- **Indexes:** 7 indexes for quick lookups
- **Deduplication:** Automatic marking at insert time
- **Pagination:** Default 10 records per page

---

## Next: Module 3

Once Module 2 is complete:
- Create API endpoints (`GET /api/leads`, `POST /api/leads/insert`, etc.)
- Build Dashboard UI to display leads
- Implement SDR features (filtering, bulk actions)

---

**Module 2 Status:** ✅ Complete
- Schema: ✅
- Migrations: ✅
- CRUD Operations: ✅
- Tests: ✅
- Documentation: ✅
