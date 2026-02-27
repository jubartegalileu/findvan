import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { query, closePool, getClient } from '../../src/db/pool.js';
import {
  insertLeads,
  getLeadsByCity,
  getLeadByPhone,
  getLeadsBySource,
  getValidLeads,
  getDuplicates,
  mergeDuplicates,
  getStats,
  clearLeads
} from '../../src/services/leads-service.js';

// Test data
const mockLeads = [
  {
    name: 'Van Escolar ABC',
    phone: '11987654321',
    email: 'contato@vanescolar.com',
    address: 'Av. Paulista, 1000',
    city: 'São Paulo',
    company_name: 'Van Escolar ABC',
    is_valid: true
  },
  {
    name: 'Transporte Escolar XYZ',
    phone: '11998765432',
    email: 'contato@transportexyz.com',
    address: 'Rua Augusta, 500',
    city: 'São Paulo',
    company_name: 'Transporte Escolar XYZ',
    is_valid: true
  },
  {
    name: 'Van Particular SP',
    phone: '11987654999',
    email: 'contato@vansp.com.br',
    address: 'R. Oscar Freire, 250',
    city: 'São Paulo',
    company_name: 'Van Particular SP',
    is_valid: true
  },
  {
    name: 'Transporte Educacional ABC',
    phone: '11987654321', // Duplicate
    email: 'duplicate@transport.com',
    address: 'Rua Vergueiro, 450',
    city: 'Rio de Janeiro',
    company_name: 'Transporte Educacional ABC',
    is_valid: true
  }
];

describe('LeadsService', () => {
  before(async () => {
    // Create leads table if not exists
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
    // Clear leads before each test
    try {
      await clearLeads();
    } catch (error) {
      // Table might not exist yet
    }
  });

  describe('insertLeads', () => {
    test('should insert leads from JSON', async () => {
      const result = await insertLeads(mockLeads, 'google_maps');

      assert.equal(result.inserted, 3, 'Should insert 3 unique leads');
      assert.equal(result.duplicate, 1, 'Should detect 1 duplicate');
      assert.equal(result.errors, 0, 'Should have no errors');
    });

    test('should return empty result for empty array', async () => {
      const result = await insertLeads([], 'google_maps');

      assert.equal(result.inserted, 0);
      assert.equal(result.duplicate, 0);
      assert.equal(result.errors, 0);
    });

    test('should validate phone format', async () => {
      const invalidLeads = [
        {
          name: 'Test',
          phone: '123', // Invalid: too short
          city: 'São Paulo',
          is_valid: true
        }
      ];

      const result = await insertLeads(invalidLeads, 'google_maps');

      assert.equal(result.errors, 1, 'Should reject invalid phone');
      assert.equal(result.inserted, 0);
    });

    test('should require name and city', async () => {
      const invalidLeads = [
        {
          phone: '11987654321'
          // Missing name and city
        }
      ];

      const result = await insertLeads(invalidLeads, 'google_maps');

      assert.equal(result.errors, 1, 'Should reject missing fields');
      assert.equal(result.inserted, 0);
    });

    test('should handle batch inserts', async () => {
      const largeBatch = Array.from({ length: 150 }, (_, i) => ({
        name: `Company ${i}`,
        phone: `119876${String(i).padStart(5, '0')}`,
        city: 'São Paulo',
        is_valid: true
      }));

      const result = await insertLeads(largeBatch, 'google_maps');

      assert.equal(result.inserted, 150, 'Should insert all 150 leads');
      assert.equal(result.errors, 0, 'Should have no errors');
    });

    test('should return detailed error information', async () => {
      const mixedLeads = [
        { name: 'Valid', phone: '11987654321', city: 'SP', is_valid: true },
        { name: 'Invalid', phone: '123', city: 'SP', is_valid: true }
      ];

      const result = await insertLeads(mixedLeads, 'google_maps');

      assert.equal(result.details.length > 0, true, 'Should include error details');
      assert.equal(result.inserted, 1);
      assert.equal(result.errors, 1);
    });
  });

  describe('getLeadsByCity', () => {
    beforeEach(async () => {
      await insertLeads(mockLeads, 'google_maps');
    });

    test('should retrieve leads by city with pagination', async () => {
      const result = await getLeadsByCity('São Paulo', 1, 10);

      assert.ok(result.leads.length > 0, 'Should return leads');
      assert.ok(result.total > 0, 'Should have total count');
      assert.equal(result.page, 1);
      assert.equal(result.limit, 10);
    });

    test('should return empty array for non-existent city', async () => {
      const result = await getLeadsByCity('Nonexistent City', 1, 10);

      assert.equal(result.leads.length, 0);
      assert.equal(result.total, 0);
    });

    test('should support pagination', async () => {
      const page1 = await getLeadsByCity('São Paulo', 1, 2);
      const page2 = await getLeadsByCity('São Paulo', 2, 2);

      assert.ok(page1.leads.length > 0);
      assert.ok(page2.pages > 1, 'Should have multiple pages');
    });
  });

  describe('getLeadByPhone', () => {
    beforeEach(async () => {
      await insertLeads(mockLeads, 'google_maps');
    });

    test('should retrieve lead by exact phone match', async () => {
      const lead = await getLeadByPhone('11987654321');

      assert.ok(lead, 'Should find lead');
      assert.equal(lead.phone, '11987654321');
      assert.ok(lead.name);
    });

    test('should return null for non-existent phone', async () => {
      const lead = await getLeadByPhone('99999999999');

      assert.equal(lead, null);
    });
  });

  describe('getLeadsBySource', () => {
    beforeEach(async () => {
      await insertLeads(mockLeads, 'google_maps');
    });

    test('should retrieve all leads from source', async () => {
      const leads = await getLeadsBySource('google_maps');

      assert.ok(leads.length > 0, 'Should return leads');
      assert.ok(leads.every(l => l.source === 'google_maps'), 'All should be from source');
    });

    test('should return empty array for non-existent source', async () => {
      const leads = await getLeadsBySource('nonexistent');

      assert.equal(leads.length, 0);
    });
  });

  describe('getValidLeads', () => {
    beforeEach(async () => {
      await insertLeads(mockLeads, 'google_maps');
    });

    test('should retrieve only valid leads', async () => {
      const result = await getValidLeads(null, 1, 10);

      assert.ok(result.leads.length > 0, 'Should return valid leads');
      assert.equal(result.is_valid, true);
      assert.ok(result.leads.every(l => l.is_valid === true), 'All should be valid');
    });

    test('should filter by city', async () => {
      const result = await getValidLeads('São Paulo', 1, 10);

      assert.ok(result.leads.length > 0);
      assert.ok(result.leads.every(l => l.city === 'São Paulo'), 'All should be from city');
    });
  });

  describe('getDuplicates', () => {
    beforeEach(async () => {
      await insertLeads(mockLeads, 'google_maps');
    });

    test('should identify duplicate groups', async () => {
      const duplicates = await getDuplicates();

      assert.ok(duplicates.length > 0, 'Should find duplicates');
      assert.ok(duplicates[0].phone, 'Should have phone');
      assert.ok(duplicates[0].count >= 2, 'Count should be >= 2');
      assert.ok(Array.isArray(duplicates[0].records), 'Should have records');
    });

    test('should return empty for no duplicates', async () => {
      await clearLeads();
      const leads = mockLeads.slice(0, 3); // Remove duplicate
      await insertLeads(leads, 'google_maps');

      const duplicates = await getDuplicates();

      assert.equal(duplicates.length, 0, 'Should have no duplicates');
    });
  });

  describe('mergeDuplicates', () => {
    test('should merge duplicate records', async () => {
      await insertLeads(mockLeads, 'google_maps');

      // Get all leads with duplicate phone
      const duplicates = await getDuplicates();
      assert.ok(duplicates.length > 0, 'Should have duplicates to merge');

      const dupGroup = duplicates[0];
      const keepId = dupGroup.records[0].id;

      const result = await mergeDuplicates(dupGroup.phone, keepId);

      assert.equal(result.merged, 1, 'Should merge 1 record');
      assert.ok(result.deleted >= 1, 'Should delete other records');
    });

    test('should throw error for non-existent ID', async () => {
      await insertLeads(mockLeads, 'google_maps');

      try {
        await mergeDuplicates('11987654321', 99999);
        assert.fail('Should throw error');
      } catch (error) {
        assert.ok(error.message.includes('not found'));
      }
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await insertLeads(mockLeads, 'google_maps');
    });

    test('should return database statistics', async () => {
      const stats = await getStats();

      assert.ok(stats.total_leads > 0, 'Should have leads');
      assert.ok(stats.sources > 0, 'Should count sources');
      assert.ok(stats.cities > 0, 'Should count cities');
      assert.ok(stats.valid_leads > 0, 'Should count valid leads');
      assert.ok(typeof stats.unique_phones === 'number', 'Should count phones');
    });
  });

  describe('clearLeads', () => {
    test('should delete all leads', async () => {
      await insertLeads(mockLeads, 'google_maps');
      let stats = await getStats();
      assert.ok(stats.total_leads > 0, 'Should have leads before clear');

      await clearLeads();
      stats = await getStats();

      assert.equal(stats.total_leads, 0, 'Should have no leads after clear');
    });
  });
});
