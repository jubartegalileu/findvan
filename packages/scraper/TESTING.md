# Google Maps Scraper — Testing Guide

## Unit Tests ✅

Todos os 27 testes unitários estão **PASSANDO**.

```bash
npm test
# Output:
# tests 27
# pass 27
# fail 0
```

---

## Integration Testing (Real Google Maps Data)

### Step 1: Quick Test (20 leads)
```bash
npm run test:scraper "São Paulo" 20
```

**Expected output:**
```
🧪 Testing Google Maps Scraper
   City: São Paulo
   Max Results: 20

✅ SCRAPER TEST PASSED
   Total leads: 15-20 (varies)
   Unique leads: 14-19
   Duplicates: 0-1
   Output file: data/raw-leads/2026-02-27-google-maps.json
   Duration: 30-60s (varies)

📋 Sample Lead:
   • Name: Van Escolar ABC
   • Phone: 11987654321
   • Address: Av. Paulista, 1000
   • Valid: true
   • Duplicate: false
```

**Troubleshooting:**
- ❌ "Puppeteer browser failed to launch"
  - Install Chromium: `npm run install-chromium`
  - Or use system Chrome: `export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome`
- ❌ "429 Too Many Requests"
  - Increase delay in browser config
  - Use proxy service
  - Reduce resultsPerPage
- ❌ "0 leads captured"
  - Verify Google Maps returns results manually (open browser, try same search)
  - Check if Google Maps DOM selectors changed (may need parser update)

---

### Step 2: Quality Validation
After running test:

```bash
npm run validate:leads data/raw-leads/2026-02-27-google-maps.json
```

**Expected output:**
```
📊 Lead Quality Report
────────────────────────────────────────────────────────────

📈 Summary:
  Total leads: 18
  ✅ Valid: 16 (88.9%)
  ❌ Invalid: 2 (11.1%)
  🔄 Duplicates: 0 (0.0%)

📋 Field Coverage:
  Phone: 16/18 (88.9%)
  Email: 4/18 (22.2%)
  Address: 17/18 (94.4%)

✨ Sample Valid Leads (first 3):
  1. Van Escolar ABC
     Phone: 11987654321
     Email: contato@vanabc.com
     City: São Paulo
     Address: Av. Paulista, 1000

────────────────────────────────────────────────────────────
✅ Quality Assessment: GOOD
   → Ready for database import
```

**Quality Assessment Criteria:**
- ✅ GOOD: Valid ≥80%, Phone ≥60%
- ⚠️ ACCEPTABLE: Valid ≥60%, Phone ≥40%
- ❌ POOR: Below acceptable thresholds

---

### Step 3: Manual Data Quality Check
Pick 10 random leads from the output and verify:

```bash
# View raw leads
cat data/raw-leads/2026-02-27-google-maps.json | jq '.[0:10]'

# Or use Python for random sample
python3 -c "
import json, random
with open('data/raw-leads/2026-02-27-google-maps.json') as f:
    leads = json.load(f)
sample = random.sample(leads, min(10, len(leads)))
for i, lead in enumerate(sample, 1):
    print(f'{i}. {lead[\"name\"]} - {lead[\"phone\"]}')
"
```

**Verification Checklist (per lead):**
- [ ] Business name is valid (no placeholder text)
- [ ] Phone number is real (11-digit Brazilian format)
- [ ] Address makes sense (not generic)
- [ ] Data is not duplicated (different phone numbers)
- [ ] City matches search criteria

**Expected Quality:**
- ✅ 9-10/10 leads should be valid real businesses
- ✅ All phone numbers should be 11-digit format
- ✅ No duplicates across sample
- ✅ Addresses should be specific street names, not generic

---

### Step 4: Full Production Test (100+ leads)
Once confident in quality:

```bash
# São Paulo - 100 leads (target: < 5 minutes)
npm run scraper:google-maps "São Paulo" 100

# Check results
npm run validate:leads
```

**Production Acceptance Criteria:**
- [ ] ≥100 leads captured
- [ ] < 5 minutes execution time
- [ ] ≥85% valid leads
- [ ] ≥80% with phone numbers
- [ ] ≥90% with addresses
- [ ] ≤5% duplicates

---

## Acceptance Criteria (Story 1.1)

**Definition of Done:**

- [ ] Scraper CLI runs: `npm run scraper:google-maps`
- [ ] Generates file: `./data/raw-leads/{date}-google-maps.json`
- [ ] Contains 100+ valid leads
- [ ] Validates phone (11 digits BR format)
- [ ] Validates address (non-empty)
- [ ] Zero critical errors (warnings ok)
- [ ] Logs structured in `./logs/scraper-{date}.log`
- [ ] Unit tests pass (27/27) ✅
- [ ] README updated ✅
- [ ] **You + Sócio manually verify 10 leads ← YOU ARE HERE**

**Next Step After Validation:**
1. Get your + Sócio approval of data quality
2. Mark story "Ready for Review" in story file
3. Move to Module 2 (Database)

---

## Output Format Reference

**Generated file: `data/raw-leads/YYYY-MM-DD-google-maps.json`**

```json
[
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
    "is_duplicate": false,
    "validation_errors": []
  }
]
```

---

## Logs Location

After running scraper:
```bash
# View latest scraper log
cat logs/scraper-*.log | tail -100

# Detailed error analysis
grep ERROR logs/scraper-*.log
grep "❌" logs/scraper-*.log
```

---

## Next Steps

1. ✅ Run unit tests (DONE)
2. ⏳ Run test scraper: `npm run test:scraper "São Paulo" 20`
3. ⏳ Validate quality: `npm run validate:leads`
4. ⏳ Manual check: You + Sócio verify 10 leads
5. ⏳ Mark story complete when all passes

---

**Story Status:** Implementation → Integration Testing → Data Validation → Ready for Review

**Timeline:** 30-45 min for full validation cycle
