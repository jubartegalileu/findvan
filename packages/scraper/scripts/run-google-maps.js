#!/usr/bin/env node

import { File } from 'node:buffer';

// Polyfill File for undici on Node 18 (must run before other imports).
if (!globalThis.File) {
  globalThis.File = File;
}

const [, , cityArg, maxArg, keywordArg] = process.argv;
const city = cityArg || 'São Paulo';
const maxResults = Number.parseInt(maxArg || '100', 10);
const keyword = (keywordArg || 'transporte escolar').trim();

const { scrapeGoogleMaps } = await import('../src/scrapers/google-maps.js');

const result = await scrapeGoogleMaps({ city, maxResults, keyword });

if (!result?.success) {
  console.error('\n❌ Scraper failed!');
  console.error(`   Error: ${result?.error || 'Unknown error'}`);
  process.exit(1);
}

console.log('\n✅ Scraper succeeded!');
console.log(`   Leads captured: ${result.totalLeads}`);
console.log(`   Unique leads: ${result.uniqueLeads}`);
console.log(`   Duplicates: ${result.duplicates}`);
console.log(`   Output: ${result.filename}`);
console.log(`   Duration: ${result.duration}`);
process.exit(0);
