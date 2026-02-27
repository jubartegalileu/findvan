/**
 * Deduplicator Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  deduplicateByPhone,
  countDuplicates,
  filterUnique
} from '../../src/validators/deduplicator.js';

describe('Deduplicator', () => {
  describe('deduplicateByPhone', () => {
    it('should flag duplicate leads by phone', () => {
      const leads = [
        { phone: '11987654321', name: 'Lead 1' },
        { phone: '11987654321', name: 'Lead 2' },
        { phone: '11912345678', name: 'Lead 3' }
      ];

      const result = deduplicateByPhone(leads);

      assert.strictEqual(result[0].is_duplicate, false);
      assert.strictEqual(result[1].is_duplicate, true);
      assert.strictEqual(result[2].is_duplicate, false);
    });

    it('should handle leads without phone', () => {
      const leads = [
        { phone: null, name: 'Lead 1' },
        { phone: '11987654321', name: 'Lead 2' },
        { phone: null, name: 'Lead 3' }
      ];

      const result = deduplicateByPhone(leads);

      assert.strictEqual(result[0].is_duplicate, false);
      assert.strictEqual(result[1].is_duplicate, false);
      assert.strictEqual(result[2].is_duplicate, false);
    });

    it('should mark all occurrences after first as duplicate', () => {
      const leads = [
        { phone: '11987654321', name: 'Lead 1' },
        { phone: '11987654321', name: 'Lead 2' },
        { phone: '11987654321', name: 'Lead 3' }
      ];

      const result = deduplicateByPhone(leads);

      assert.strictEqual(result[0].is_duplicate, false);
      assert.strictEqual(result[1].is_duplicate, true);
      assert.strictEqual(result[2].is_duplicate, true);
    });
  });

  describe('countDuplicates', () => {
    it('should count duplicates correctly', () => {
      const leads = [
        { phone: '11987654321', is_duplicate: false },
        { phone: '11987654321', is_duplicate: true },
        { phone: '11912345678', is_duplicate: false }
      ];

      const counts = countDuplicates(leads);

      assert.strictEqual(counts.total, 3);
      assert.strictEqual(counts.unique, 2);
      assert.strictEqual(counts.duplicates, 1);
      assert.strictEqual(counts.duplicatePercentage, '33.33');
    });

    it('should handle no duplicates', () => {
      const leads = [
        { is_duplicate: false },
        { is_duplicate: false },
        { is_duplicate: false }
      ];

      const counts = countDuplicates(leads);

      assert.strictEqual(counts.total, 3);
      assert.strictEqual(counts.unique, 3);
      assert.strictEqual(counts.duplicates, 0);
      assert.strictEqual(counts.duplicatePercentage, '0.00');
    });

    it('should handle all duplicates', () => {
      const leads = [
        { is_duplicate: false },
        { is_duplicate: true },
        { is_duplicate: true }
      ];

      const counts = countDuplicates(leads);

      assert.strictEqual(counts.total, 3);
      assert.strictEqual(counts.unique, 1);
      assert.strictEqual(counts.duplicates, 2);
      assert.strictEqual(counts.duplicatePercentage, '66.67');
    });

    it('should handle empty array', () => {
      const counts = countDuplicates([]);

      assert.strictEqual(counts.total, 0);
      assert.strictEqual(counts.unique, 0);
      assert.strictEqual(counts.duplicates, 0);
      assert.strictEqual(counts.duplicatePercentage, 0);
    });
  });

  describe('filterUnique', () => {
    it('should filter out duplicate leads', () => {
      const leads = [
        { phone: '11987654321', is_duplicate: false, name: 'Lead 1' },
        { phone: '11987654321', is_duplicate: true, name: 'Lead 2' },
        { phone: '11912345678', is_duplicate: false, name: 'Lead 3' }
      ];

      const unique = filterUnique(leads);

      assert.strictEqual(unique.length, 2);
      assert.strictEqual(unique[0].name, 'Lead 1');
      assert.strictEqual(unique[1].name, 'Lead 3');
    });

    it('should return all leads if none are duplicates', () => {
      const leads = [
        { is_duplicate: false },
        { is_duplicate: false },
        { is_duplicate: false }
      ];

      const unique = filterUnique(leads);

      assert.strictEqual(unique.length, 3);
    });

    it('should return empty array if all are duplicates', () => {
      const leads = [
        { is_duplicate: true },
        { is_duplicate: true }
      ];

      const unique = filterUnique(leads);

      assert.strictEqual(unique.length, 0);
    });
  });
});
