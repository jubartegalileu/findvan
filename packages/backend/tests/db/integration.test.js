import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { query, closePool } from '../../src/db/pool.js';
import {
  insertLeads,
  getLeadsByCity,
  getLeadByPhone,
  getLeadsBySource,
  getValidLeads,
  getDuplicates,
  mergeDuplicates,
  getStats,
  clearLeads,
} from '../../src/services/leads-service.js';

// Simulated data from Module 1 Scraper
const scrapedLeads = [
  {
    id: 'gm_1772164836736_meke9llsd',
    source: 'google_maps',
    name: 'Van Escolar ABC',
    phone: '11987654321',
    email: '',
    address: 'Av. Paulista, 1000 - São Paulo',
    city: 'São Paulo',
    company_name: 'Van Escolar ABC',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.736Z',
    is_valid: true,
    is_duplicate: false,
    validation_errors: [],
  },
  {
    id: 'gm_1772164836736_wyr8mk852',
    source: 'google_maps',
    name: 'Transporte Escolar XYZ',
    phone: '11998765432',
    email: '',
    address: 'Rua Augusta, 500 - São Paulo',
    city: 'São Paulo',
    company_name: 'Transporte Escolar XYZ',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.736Z',
    is_valid: true,
    is_duplicate: false,
    validation_errors: [],
  },
  {
    id: 'gm_1772164836736_5fjc35dx7',
    source: 'google_maps',
    name: 'Van Particular SP',
    phone: '11987654999',
    email: 'contato@vansp.com.br',
    address: 'R. Oscar Freire, 250 - São Paulo',
    city: 'São Paulo',
    company_name: 'Van Particular SP',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.736Z',
    is_valid: true,
    is_duplicate: false,
    validation_errors: [],
  },
  {
    id: 'gm_1772164836737_hwamq3rzd',
    source: 'google_maps',
    name: 'Transporte Escolar 24h',
    phone: '11987654444',
    email: '',
    address: 'Av. Rebouças, 800 - São Paulo',
    city: 'São Paulo',
    company_name: 'Transporte Escolar 24h',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.737Z',
    is_valid: true,
    is_duplicate: false,
    validation_errors: [],
  },
  {
    id: 'gm_1772164836737_o2s7sirr7',
    source: 'google_maps',
    name: 'Van Escolar Premium',
    phone: '11998765432', // Duplicate of record 2
    email: '',
    address: 'Av. Faria Lima, 600 - São Paulo',
    city: 'São Paulo',
    company_name: 'Van Escolar Premium',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.737Z',
    is_valid: true,
    is_duplicate: true,
    validation_errors: [],
  },
  {
    id: 'gm_1772164836737_eu0qjgmc8',
    source: 'google_maps',
    name: 'Transporte Educacional ABC',
    phone: '11987654321', // Duplicate of record 1
    email: 'contato@transporteeducacional.com',
    address: 'Rua Vergueiro, 450 - São Paulo',
    city: 'São Paulo',
    company_name: 'Transporte Educacional ABC',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.737Z',
    is_valid: true,
    is_duplicate: true,
    validation_errors: [],
  },
  {
    id: 'gm_1772164836737_8ixnurwjz',
    source: 'google_maps',
    name: 'Vans Escolares SP',
    phone: '11999998888',
    email: '',
    address: 'Av. Imigrantes, 1500 - São Paulo',
    city: 'São Paulo',
    company_name: 'Vans Escolares SP',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.737Z',
    is_valid: true,
    is_duplicate: false,
    validation_errors: [],
  },
  {
    id: 'gm_1772164836737_j763h3c53',
    source: 'google_maps',
    name: 'Transporte Escolar Seguro',
    phone: '11987654555',
    email: 'info@transporteseguro.com.br',
    address: 'Rua Consolação, 300 - São Paulo',
    city: 'São Paulo',
    company_name: 'Transporte Escolar Seguro',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.737Z',
    is_valid: true,
    is_duplicate: false,
    validation_errors: [],
  },
  {
    id: 'gm_1772164836737_5gymmasz3',
    source: 'google_maps',
    name: 'Van Edu SP',
    phone: '11987654888',
    email: '',
    address: 'Av. Paulista, 2000 - São Paulo',
    city: 'São Paulo',
    company_name: 'Van Edu SP',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.737Z',
    is_valid: true,
    is_duplicate: false,
    validation_errors: [],
  },
  {
    id: 'gm_1772164836737_sta13h692',
    source: 'google_maps',
    name: 'Transporte Infantil ABC',
    phone: '11999888777',
    email: 'reservas@transporteinfantil.com.br',
    address: 'Rua Bela Cintra, 700 - São Paulo',
    city: 'São Paulo',
    company_name: 'Transporte Infantil ABC',
    cnpj: null,
    url: null,
    captured_at: '2026-02-27T04:00:36.737Z',
    is_valid: true,
    is_duplicate: false,
    validation_errors: [],
  },
];

describe('Scraper → Database → Query Integration', () => {
  before(async () => {
    // Create leads table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS leads (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        name TEXT NOT NULL,
        phone VARCHAR(15),
        email VARCHAR(255),
        address TEXT,
        city TEXT NOT NULL,
        company_name TEXT,
        cnpj VARCHAR(20),
        url TEXT,
        captured_at TIMESTAMP DEFAULT NOW(),
        is_valid BOOLEAN DEFAULT true,
        is_duplicate BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(phone, source),
        CONSTRAINT valid_phone_length CHECK (phone IS NULL OR LENGTH(phone) = 11)
      )
    `;

    try {
      await query(createTableSQL, []);
    } catch (error) {
      // Table might already exist
    }
  });

  after(async () => {
    await closePool();
  });

  beforeEach(async () => {
    try {
      await clearLeads();
    } catch (error) {
      // Ignore
    }
  });

  test('End-to-end: Scraper mock data → Database storage → Query validation', async () => {
    console.log('\n📊 Integration Test: Module 1 + Module 2\n');

    // Step 1: Simulate scraper output (10 leads with 2 duplicates)
    console.log('Step 1: Insert scraped leads from Module 1');
    const insertResult = await insertLeads(scrapedLeads, 'google_maps');

    console.log(`  ✓ Inserted: ${insertResult.inserted}`);
    console.log(`  ✓ Duplicates: ${insertResult.duplicate}`);
    console.log(`  ✓ Errors: ${insertResult.errors}`);

    assert.equal(insertResult.inserted, 8, 'Should insert 8 unique leads');
    assert.equal(insertResult.duplicate, 2, 'Should detect 2 duplicates');
    assert.equal(insertResult.errors, 0, 'Should have no errors');

    // Step 2: Query by city
    console.log('\nStep 2: Query leads by city');
    const cityResult = await getLeadsByCity('São Paulo', 1, 100);

    console.log(`  ✓ Found ${cityResult.leads.length} leads in São Paulo`);
    console.log(`  ✓ Total: ${cityResult.total}, Pages: ${cityResult.pages}`);

    assert.equal(cityResult.leads.length, 8, 'Should find 8 leads in São Paulo');
    assert.equal(cityResult.total, 8);

    // Step 3: Query valid leads
    console.log('\nStep 3: Query valid (is_valid=true) leads');
    const validResult = await getValidLeads('São Paulo', 1, 100);

    console.log(`  ✓ Found ${validResult.leads.length} valid leads`);
    console.log(`  ✓ All is_valid: ${validResult.is_valid}`);

    assert.equal(validResult.leads.length, 8, 'All should be valid');
    assert.ok(validResult.leads.every(l => l.is_valid === true));

    // Step 4: Query by phone
    console.log('\nStep 4: Query lead by phone (exact match)');
    const lead = await getLeadByPhone('11987654321');

    console.log(`  ✓ Found: ${lead.name}`);
    console.log(`  ✓ Phone: ${lead.phone}`);
    console.log(`  ✓ Email: ${lead.email || '(empty)'}`);

    assert.ok(lead, 'Should find lead');
    assert.equal(lead.phone, '11987654321');

    // Step 5: Query by source
    console.log('\nStep 5: Query leads by source');
    const sourceResult = await getLeadsBySource('google_maps', 100);

    console.log(`  ✓ Found ${sourceResult.length} leads from google_maps`);

    assert.equal(sourceResult.length, 8);

    // Step 6: Get duplicate groups
    console.log('\nStep 6: Identify and retrieve duplicates');
    const duplicates = await getDuplicates();

    console.log(`  ✓ Found ${duplicates.length} duplicate groups`);
    if (duplicates.length > 0) {
      console.log(`  ✓ Phones: ${duplicates.map(d => d.phone).join(', ')}`);
      duplicates.forEach(dup => {
        console.log(`    - ${dup.phone}: ${dup.count} records`);
      });
    }

    assert.ok(duplicates.length > 0, 'Should find duplicates');

    // Step 7: Merge duplicates
    console.log('\nStep 7: Merge duplicate records');
    if (duplicates.length > 0) {
      const dupGroup = duplicates[0];
      const keepId = dupGroup.records[0].id;

      const mergeResult = await mergeDuplicates(dupGroup.phone, keepId);
      console.log(`  ✓ Merged ${mergeResult.merged} record(s)`);
      console.log(`  ✓ Deleted ${mergeResult.deleted} duplicate(s)`);

      assert.ok(mergeResult.deleted >= 1);
    }

    // Step 8: Get final statistics
    console.log('\nStep 8: Database statistics');
    const stats = await getStats();

    console.log(`  ✓ Total leads: ${stats.total_leads}`);
    console.log(`  ✓ Sources: ${stats.sources}`);
    console.log(`  ✓ Cities: ${stats.cities}`);
    console.log(`  ✓ Valid leads: ${stats.valid_leads}`);
    console.log(`  ✓ Duplicate leads: ${stats.duplicate_leads}`);
    console.log(`  ✓ Unique phones: ${stats.unique_phones}`);

    assert.ok(stats.total_leads > 0, 'Should have leads');

    console.log('\n✅ Integration test passed!\n');
  });

  test('Multiple sources should be handled correctly', async () => {
    // Insert from different sources
    const source1Leads = scrapedLeads.slice(0, 3);
    const source2Leads = scrapedLeads.slice(3, 6).map(l => ({
      ...l,
      source: 'facebook',
      phone: '55' + l.phone, // Add area code to differentiate
    }));

    await insertLeads(source1Leads, 'google_maps');
    const result2 = await insertLeads(source2Leads, 'facebook');

    assert.ok(result2.inserted > 0, 'Should insert from second source');

    const allSources = await getLeadsBySource('google_maps');
    const fbSources = await getLeadsBySource('facebook');

    assert.ok(allSources.length > 0);
    assert.ok(fbSources.length > 0);
  });
});
