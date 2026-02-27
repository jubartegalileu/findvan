#!/usr/bin/env node

/**
 * Test Parser V2 with Sample Google Maps HTML
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseGoogleMapsHTML, filterValidLeads } from '../src/scrapers/parser-v2.js';
import { validateLead, cleanLead } from '../src/validators/lead-validator.js';
import { deduplicateByPhone, countDuplicates } from '../src/validators/deduplicator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const main = async () => {
  console.log(`\n🧪 Testing Parser V2 with Sample Google Maps HTML\n`);

  // Load sample HTML
  const samplePath = path.join(__dirname, '../data/google-maps-sample.html');
  if (!fs.existsSync(samplePath)) {
    console.error(`❌ Sample HTML not found: ${samplePath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(samplePath, 'utf-8');
  console.log(`✓ Loaded sample HTML (${html.length} bytes)`);

  // Parse
  console.log(`\n📊 Parsing HTML...`);
  const rawLeads = parseGoogleMapsHTML(html, 'São Paulo');
  console.log(`✓ Extracted ${rawLeads.length} raw leads\n`);

  // Clean
  console.log(`🧹 Cleaning leads...`);
  const cleanedLeads = rawLeads.map(cleanLead);

  // Validate
  console.log(`✔️ Validating leads...`);
  const validatedLeads = cleanedLeads.map(lead => {
    const validation = validateLead(lead);
    return {
      ...lead,
      is_valid: validation.isValid,
      validation_errors: validation.errors
    };
  });

  // Filter valid
  const validLeads = validatedLeads.filter(l => l.is_valid);
  console.log(`✓ ${validLeads.length} leads passed validation\n`);

  // Deduplicate
  console.log(`🔍 Detecting duplicates...`);
  const deduplicatedLeads = deduplicateByPhone(validLeads);
  const dupStats = countDuplicates(deduplicatedLeads);
  console.log(`✓ ${dupStats.unique} unique, ${dupStats.duplicates} duplicates\n`);

  // Display results
  console.log(`📋 Sample Valid Leads:\n`);
  const uniqueLeads = deduplicatedLeads.filter(l => !l.is_duplicate);
  uniqueLeads.slice(0, 5).forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.name}`);
    console.log(`   Phone: ${lead.phone}`);
    console.log(`   Email: ${lead.email || '(none)'}`);
    console.log(`   Address: ${lead.address}`);
    console.log();
  });

  // Statistics
  console.log(`📊 Overall Statistics:\n`);
  console.log(`Total extracted: ${rawLeads.length}`);
  console.log(`Total valid: ${validLeads.length}`);
  console.log(`Total unique: ${dupStats.unique}`);
  console.log(`Total duplicates: ${dupStats.duplicates}`);
  console.log(`Valid rate: ${((validLeads.length / rawLeads.length) * 100).toFixed(1)}%`);
  console.log(`Unique rate: ${((dupStats.unique / validLeads.length) * 100).toFixed(1)}%\n`);

  // Save results
  const outputPath = path.join(__dirname, '../data/parser-v2-test-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats: {
      total_extracted: rawLeads.length,
      total_valid: validLeads.length,
      total_unique: dupStats.unique,
      total_duplicates: dupStats.duplicates,
      valid_rate: `${((validLeads.length / rawLeads.length) * 100).toFixed(1)}%`,
      unique_rate: `${((dupStats.unique / validLeads.length) * 100).toFixed(1)}%`
    },
    leads: deduplicatedLeads
  }, null, 2));
  console.log(`✅ Results saved to: ${outputPath}`);

  // Assessment
  if (validLeads.length >= 8 && dupStats.unique >= 7) {
    console.log(`\n✅ Parser V2: WORKING ✓`);
    process.exit(0);
  } else {
    console.log(`\n⚠️ Parser V2: Need improvement`);
    process.exit(1);
  }
};

main();
