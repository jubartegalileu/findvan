#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, closePool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Database Migration Runner
 * Executes SQL migrations from the migrations directory
 */

async function runMigrations() {
  console.log('🔄 Starting database migrations...\n');

  const migrationsDir = path.join(__dirname, 'migrations');

  // Get all SQL files in migrations directory
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  No migration files found');
    await closePool();
    process.exit(0);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`📋 Running: ${file}`);

    try {
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Split by semicolon to execute multiple statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        await query(statement, []);
      }

      console.log(`✅ ${file} completed\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${file} failed:`, error.message);
      console.error('   SQL Error:', error.detail || error.hint || '');
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('='.repeat(50));

  await closePool();

  if (errorCount > 0) {
    process.exit(1);
  }

  process.exit(0);
}

// Run migrations
runMigrations().catch(error => {
  console.error('Fatal error:', error);
  closePool();
  process.exit(1);
});
