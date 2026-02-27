#!/usr/bin/env node

/**
 * Test Script for Google Maps Scraper
 * Runs scraper on a small dataset to validate functionality
 * Usage: node scripts/test-scraper.js [city] [maxResults]
 */

import logger from '../src/logger.js';
import { scrapeGoogleMaps } from '../src/scrapers/google-maps.js';
import fs from 'fs';
import path from 'path';

const main = async () => {
  const city = process.argv[2] || 'São Paulo';
  const maxResults = parseInt(process.argv[3] || '20', 10);

  console.log(`\n🧪 Testing Google Maps Scraper`);
  console.log(`   City: ${city}`);
  console.log(`   Max Results: ${maxResults}`);
  console.log(`   Timestamp: ${new Date().toISOString()}\n`);

  try {
    const result = await scrapeGoogleMaps({
      city,
      maxResults,
      delay: 2000 // Increase delay for testing to avoid blocks
    });

    if (result.success) {
      console.log('\n✅ SCRAPER TEST PASSED');
      console.log(`   Total leads: ${result.totalLeads}`);
      console.log(`   Unique leads: ${result.uniqueLeads}`);
      console.log(`   Duplicates: ${result.duplicates}`);
      console.log(`   Output file: ${result.filePath}`);
      console.log(`   Duration: ${result.duration}\n`);

      // Read and display sample leads
      const fileContent = fs.readFileSync(result.filePath, 'utf-8');
      const leads = JSON.parse(fileContent);

      if (leads.length > 0) {
        console.log('📋 Sample Lead (first 3 fields):');
        const sample = leads[0];
        console.log(`   • Name: ${sample.name}`);
        console.log(`   • Phone: ${sample.phone}`);
        console.log(`   • Address: ${sample.address}`);
        console.log(`   • Valid: ${sample.is_valid}`);
        console.log(`   • Duplicate: ${sample.is_duplicate}\n`);
      }

      process.exit(0);
    } else {
      console.error('\n❌ SCRAPER TEST FAILED');
      console.error(`   Error: ${result.error}`);
      console.error(`   Leads captured: ${result.leads}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ FATAL ERROR');
    console.error(`   ${error.message}`);
    console.error(`   Stack: ${error.stack}\n`);
    process.exit(1);
  }
};

main();
