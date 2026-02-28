import { describe, expect, it } from 'vitest';
import { normalizeApiBase } from '../src/lib/apiBase.js';

describe('api base normalization', () => {
  it('rewrites vite frontend port 5173 to backend 8000', () => {
    expect(normalizeApiBase('http://localhost:5173')).toBe('http://localhost:8000');
  });

  it('keeps valid backend url unchanged', () => {
    expect(normalizeApiBase('http://localhost:8000')).toBe('http://localhost:8000');
  });

  it('returns null for empty values', () => {
    expect(normalizeApiBase('')).toBeNull();
    expect(normalizeApiBase(null)).toBeNull();
  });
});
