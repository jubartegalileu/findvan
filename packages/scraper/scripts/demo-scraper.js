#!/usr/bin/env node

/**
 * Demo Scraper - Uses Mock Data (No Google Maps Access Required)
 * Perfect for demonstration and testing without network calls
 */

import { scrapeGoogleMaps } from '../src/scrapers/google-maps-v2.js';
import logger from '../src/logger.js';

const main = async () => {
  const city = process.argv[2] || 'São Paulo';
  const maxResults = parseInt(process.argv[3] || '20', 10);

  console.log(`\n🎭 DEMO: Google Maps Scraper (Using Mock Data)`);
  console.log(`   City: ${city}`);
  console.log(`   Max Results: ${maxResults}\n`);

  try {
    const result = await scrapeGoogleMaps({
      city,
      maxResults,
      useMock: true  // Use sample data instead of real Google Maps
    });

    if (result.success) {
      console.log('\n✅ DEMO COMPLETE\n');
      console.log(`   Leads captured: ${result.totalLeads}`);
      console.log(`   Unique leads: ${result.uniqueLeads}`);
      console.log(`   Duplicates: ${result.duplicates}`);
      console.log(`   Output file: ${result.filePath}`);
      console.log(`   Duration: ${result.duration}\n`);

      // Show sample
      console.log(`📋 This demonstrates the scraper pipeline:`);
      console.log(`   1. ✓ Load sample HTML data`);
      console.log(`   2. ✓ Parse business listings`);
      console.log(`   3. ✓ Validate phone/email/address`);
      console.log(`   4. ✓ Detect duplicates`);
      console.log(`   5. ✓ Export to JSON with metadata\n`);

      console.log(`🚀 Ready to connect to real Google Maps data!\n`);
      process.exit(0);
    } else {
      console.error('\n❌ DEMO FAILED');
      console.error(`   Error: ${result.error}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
};

main();
