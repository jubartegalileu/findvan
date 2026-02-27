/**
 * Lead Validator Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validatePhone,
  validateEmail,
  validateAddress,
  validateLead,
  normalizePhone,
  cleanLead
} from '../../src/validators/lead-validator.js';

describe('Lead Validator', () => {
  describe('validatePhone', () => {
    it('should validate correct Brazilian phone (11 digits)', () => {
      assert.strictEqual(validatePhone('11987654321'), true);
      assert.strictEqual(validatePhone('(11) 98765-4321'), true);
      assert.strictEqual(validatePhone('11 98765-4321'), true);
    });

    it('should reject invalid phone numbers', () => {
      assert.strictEqual(validatePhone('123'), false);
      assert.strictEqual(validatePhone('11 1234'), false);
      assert.strictEqual(validatePhone(''), false);
      assert.strictEqual(validatePhone(null), false);
    });

    it('should reject 10-digit phone', () => {
      assert.strictEqual(validatePhone('1198765432'), false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      assert.strictEqual(validateEmail('test@example.com'), true);
      assert.strictEqual(validateEmail('user+tag@domain.co.uk'), true);
    });

    it('should reject invalid email format', () => {
      assert.strictEqual(validateEmail('invalid-email'), false);
      assert.strictEqual(validateEmail('test@'), false);
    });

    it('should treat empty email as valid (optional field)', () => {
      assert.strictEqual(validateEmail(''), true);
      assert.strictEqual(validateEmail(null), true);
    });
  });

  describe('validateAddress', () => {
    it('should validate non-empty address', () => {
      assert.strictEqual(validateAddress('Av. Paulista, 1000'), true);
      assert.strictEqual(validateAddress('São Paulo, SP'), true);
    });

    it('should reject empty address', () => {
      assert.strictEqual(validateAddress(''), false);
      assert.strictEqual(validateAddress('  '), false);
      assert.strictEqual(validateAddress(null), false);
    });
  });

  describe('validateLead', () => {
    it('should validate complete valid lead', () => {
      const lead = {
        name: 'Van Escolar ABC',
        phone: '11987654321',
        email: 'test@example.com',
        address: 'Av. Paulista, 1000'
      };
      const result = validateLead(lead);
      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it('should fail on invalid phone', () => {
      const lead = {
        name: 'Van Escolar ABC',
        phone: '123',
        address: 'Av. Paulista, 1000'
      };
      const result = validateLead(lead);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes('phone')));
    });

    it('should fail on missing name', () => {
      const lead = {
        name: '',
        phone: '11987654321',
        address: 'Av. Paulista, 1000'
      };
      const result = validateLead(lead);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes('name')));
    });

    it('should fail on missing address', () => {
      const lead = {
        name: 'Van Escolar ABC',
        phone: '11987654321',
        address: ''
      };
      const result = validateLead(lead);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some(e => e.includes('address')));
    });
  });

  describe('normalizePhone', () => {
    it('should normalize phone with 11 digits', () => {
      assert.strictEqual(normalizePhone('11987654321'), '11987654321');
      assert.strictEqual(normalizePhone('(11) 98765-4321'), '11987654321');
    });

    it('should return null for invalid phone', () => {
      assert.strictEqual(normalizePhone('123'), null);
      assert.strictEqual(normalizePhone('1198765432'), null); // 10 digits
    });

    it('should handle null/undefined', () => {
      assert.strictEqual(normalizePhone(null), null);
      assert.strictEqual(normalizePhone(undefined), null);
    });
  });

  describe('cleanLead', () => {
    it('should trim and clean lead data', () => {
      const lead = {
        name: '  Van Escolar ABC  ',
        phone: '11987654321',
        email: '  TEST@EXAMPLE.COM  ',
        address: '  Av. Paulista, 1000  ',
        city: '  São Paulo  '
      };

      const cleaned = cleanLead(lead);

      assert.strictEqual(cleaned.name, 'Van Escolar ABC');
      assert.strictEqual(cleaned.email, 'test@example.com');
      assert.strictEqual(cleaned.address, 'Av. Paulista, 1000');
      assert.strictEqual(cleaned.city, 'São Paulo');
    });

    it('should normalize phone during cleaning', () => {
      const lead = {
        name: 'Test',
        phone: '(11) 98765-4321',
        email: '',
        address: 'Test St'
      };

      const cleaned = cleanLead(lead);
      assert.strictEqual(cleaned.phone, '11987654321');
    });
  });
});
