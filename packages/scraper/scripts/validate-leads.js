#!/usr/bin/env node

/**
 * Lead Quality Validation Script
 * Analyzes captured leads for quality metrics
 * Usage: node scripts/validate-leads.js [filepath]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to find latest file
const findLatestLeadsFile = (dir = './data/raw-leads') => {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(dir, f),
      time: fs.statSync(path.join(dir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    throw new Error('No leads files found in ' + dir);
  }

  return files[0];
};

const validateLeads = (leads) => {
  const stats = {
    total: leads.length,
    valid: 0,
    invalid: 0,
    duplicates: 0,
    withPhone: 0,
    withEmail: 0,
    withAddress: 0,
    byCity: {},
    invalidReasons: {}
  };

  leads.forEach(lead => {
    // Count valid/invalid
    if (lead.is_valid) {
      stats.valid++;
    } else {
      stats.invalid++;
    }

    // Count duplicates
    if (lead.is_duplicate) {
      stats.duplicates++;
    }

    // Count fields
    if (lead.phone) stats.withPhone++;
    if (lead.email) stats.withEmail++;
    if (lead.address) stats.withAddress++;

    // Count by city
    const city = lead.city || 'Unknown';
    stats.byCity[city] = (stats.byCity[city] || 0) + 1;

    // Track invalid reasons
    if (!lead.is_valid && lead.validation_errors) {
      lead.validation_errors.forEach(err => {
        stats.invalidReasons[err] = (stats.invalidReasons[err] || 0) + 1;
      });
    }
  });

  return stats;
};

const main = async () => {
  try {
    let filepath = process.argv[2];

    if (!filepath) {
      const latest = findLatestLeadsFile();
      filepath = latest.path;
      console.log(`📁 Using latest file: ${latest.name}\n`);
    }

    if (!fs.existsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const leads = JSON.parse(content);

    const stats = validateLeads(leads);

    console.log(`\n📊 Lead Quality Report`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`File: ${path.basename(filepath)}`);
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`\n📈 Summary:`);
    console.log(`  Total leads: ${stats.total}`);
    console.log(`  ✅ Valid: ${stats.valid} (${((stats.valid/stats.total)*100).toFixed(1)}%)`);
    console.log(`  ❌ Invalid: ${stats.invalid} (${((stats.invalid/stats.total)*100).toFixed(1)}%)`);
    console.log(`  🔄 Duplicates: ${stats.duplicates} (${((stats.duplicates/stats.total)*100).toFixed(1)}%)`);

    console.log(`\n📋 Field Coverage:`);
    console.log(`  Phone: ${stats.withPhone}/${stats.total} (${((stats.withPhone/stats.total)*100).toFixed(1)}%)`);
    console.log(`  Email: ${stats.withEmail}/${stats.total} (${((stats.withEmail/stats.total)*100).toFixed(1)}%)`);
    console.log(`  Address: ${stats.withAddress}/${stats.total} (${((stats.withAddress/stats.total)*100).toFixed(1)}%)`);

    if (Object.keys(stats.byCity).length > 0) {
      console.log(`\n🏙️ By City:`);
      Object.entries(stats.byCity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([city, count]) => {
          console.log(`  ${city}: ${count}`);
        });
    }

    if (Object.keys(stats.invalidReasons).length > 0) {
      console.log(`\n⚠️ Invalid Reasons:`);
      Object.entries(stats.invalidReasons)
        .sort((a, b) => b[1] - a[1])
        .forEach(([reason, count]) => {
          console.log(`  ${reason}: ${count}`);
        });
    }

    // Show sample valid leads
    const validLeads = leads.filter(l => l.is_valid && !l.is_duplicate);
    if (validLeads.length > 0) {
      console.log(`\n✨ Sample Valid Leads (first 3):`);
      validLeads.slice(0, 3).forEach((lead, i) => {
        console.log(`\n  ${i + 1}. ${lead.name}`);
        console.log(`     Phone: ${lead.phone}`);
        console.log(`     Email: ${lead.email || '(none)'}`);
        console.log(`     City: ${lead.city}`);
        console.log(`     Address: ${lead.address}`);
      });
    }

    console.log(`\n${'─'.repeat(60)}\n`);

    // Quality assessment
    const validPercentage = (stats.valid / stats.total) * 100;
    const phonePercentage = (stats.withPhone / stats.total) * 100;

    if (validPercentage >= 80 && phonePercentage >= 60) {
      console.log('✅ Quality Assessment: GOOD');
      console.log('   → Ready for database import');
      process.exit(0);
    } else if (validPercentage >= 60 && phonePercentage >= 40) {
      console.log('⚠️ Quality Assessment: ACCEPTABLE');
      console.log('   → Review data before import');
      process.exit(0);
    } else {
      console.log('❌ Quality Assessment: POOR');
      console.log('   → Review scraper configuration');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
};

main();
