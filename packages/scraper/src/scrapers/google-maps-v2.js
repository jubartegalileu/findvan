#!/usr/bin/env node

/**
 * Google Maps Scraper V2
 * With mock mode support for testing without network access
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger.js';
import { defaultScraperConfig, browserConfig, navigationOptions } from '../config/browser.js';
import { parseGoogleMapsHTML } from './parser-v2.js';
import { validateLead, cleanLead } from '../validators/lead-validator.js';
import { deduplicateByPhone, countDuplicates } from '../validators/deduplicator.js';
import { writeLeadsToJSON } from '../storage/json-writer.js';

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main scraper function
 */
async function scrapeGoogleMaps(options = {}) {
  const {
    city = 'São Paulo',
    keyword = 'transporte escolar',
    maxResults = 100,
    delay = defaultScraperConfig.delay,
    useMock = false
  } = options;

  const startTime = new Date();
  logger.info(`🚀 Starting Google Maps scraper for "${keyword}" in ${city}`, {
    city,
    keyword,
    maxResults,
    useMock,
    timestamp: startTime.toISOString()
  });

  let browser;
  let page;
  let html = null;
  const leads = [];

  try {
    // Use mock data if requested
    if (useMock) {
      logger.info('🎭 Using mock data (sample Google Maps HTML)');
      const mockPath = path.join(__dirname, '../../data/google-maps-sample.html');

      if (fs.existsSync(mockPath)) {
        html = fs.readFileSync(mockPath, 'utf-8');
        logger.info(`✓ Loaded sample HTML (${html.length} bytes)`);
      } else {
        throw new Error(`Mock file not found: ${mockPath}`);
      }
    } else {
      // Real Google Maps scraping
      logger.info('📱 Launching Puppeteer browser');
      browser = await puppeteer.launch(browserConfig);
      page = await browser.newPage();

      await page.setViewport({ width: 1280, height: 720 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${keyword} ${city}`)}`;
      logger.info(`🗺️ Navigating to Google Maps search`, { url: mapsUrl });

      await page.goto(mapsUrl, navigationOptions);

      // Wait for results
      await page.waitForSelector('[role="button"][data-business-status]', {
        timeout: 10000
      }).catch(() => {
        logger.warn('⚠️ Could not find exact selector, trying alternatives');
      });

      // Scroll to load more results
      let previousHeight = 0;
      let scrollCount = 0;
      const maxScrolls = 5;

      logger.info('📜 Scrolling to load results');

      while (scrollCount < maxScrolls && leads.length < maxResults) {
        const scrollHeight = await page.evaluate(
          () => document.querySelector('[role="region"][aria-label*="Result"]')?.scrollHeight || 0
        );

        if (scrollHeight === previousHeight && scrollCount > 0) {
          logger.info('✓ Reached end of results list');
          break;
        }

        await page.evaluate(
          () => {
            const resultsPanel = document.querySelector('[role="region"][aria-label*="Result"]');
            if (resultsPanel) resultsPanel.scrollBy(0, 500);
          }
        );

        previousHeight = scrollHeight;
        scrollCount++;

        await page.waitForTimeout(delay);

        html = await page.content();
        const parsed = parseGoogleMapsHTML(html, city);

        for (const lead of parsed) {
          const exists = leads.some(l => l.phone === lead.phone && lead.phone);
          if (!exists && leads.length < maxResults) {
            leads.push(lead);
            if (leads.length % 10 === 0) {
              logger.info(`✓ Extracted ${leads.length} leads so far`);
            }
          }
        }
      }

      logger.info(`✓ Extracted ${leads.length} raw leads from Google Maps`);
    }

    // If using mock, parse now
    if (useMock && html) {
      const parsed = parseGoogleMapsHTML(html, city);
      leads.push(...parsed);
      logger.info(`✓ Parsed ${parsed.length} leads from mock HTML`);
    }

    // Clean leads
    logger.info('🧹 Cleaning lead data');
    const cleanedLeads = leads.map(cleanLead);

    // Validate
    logger.info('✔️ Validating leads');
    const validatedLeads = cleanedLeads.map(lead => {
      const validation = validateLead(lead);
      return {
        ...lead,
        is_valid: validation.isValid,
        validation_errors: validation.errors
      };
    });

    // Filter valid only
    const filteredLeads = validatedLeads.filter(l => l.is_valid);
    logger.info(`✓ ${filteredLeads.length} leads passed validation`);

    // Deduplicate
    logger.info('🔍 Detecting duplicates');
    const deduplicatedLeads = deduplicateByPhone(filteredLeads);
    const dupStats = countDuplicates(deduplicatedLeads);
    logger.info(
      `✓ Deduplication complete: ${dupStats.unique} unique, ${dupStats.duplicates} duplicates`,
      dupStats
    );

    // Write to file
    logger.info('💾 Writing leads to JSON');
    const writeResult = writeLeadsToJSON(deduplicatedLeads, 'google-maps');
    logger.info(`✓ Wrote ${writeResult.count} leads to ${writeResult.filename}`);

    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logger.info(`✅ Scraper complete in ${duration} seconds`, {
      totalLeads: writeResult.count,
      uniqueLeads: writeResult.unique,
      duplicates: writeResult.duplicates,
      filePath: writeResult.filePath,
      duration: `${duration}s`
    });

    return {
      success: true,
      totalLeads: writeResult.count,
      uniqueLeads: writeResult.unique,
      duplicates: writeResult.duplicates,
      filePath: writeResult.filePath,
      filename: writeResult.filename,
      duration: `${duration}s`
    };
  } catch (error) {
    logger.error('❌ Scraper error:', {
      message: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message,
      leads: leads.length
    };
  } finally {
    if (page) await page.close();
    if (browser) {
      await browser.close();
      logger.info('🔌 Browser closed');
    }
  }
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const city = process.argv[2] || 'São Paulo';
  const maxResults = parseInt(process.argv[3] || '100', 10);
  const useMock = process.argv.includes('--mock');

  logger.info('🎬 Google Maps Scraper started', {
    city,
    maxResults,
    useMock,
    timestamp: new Date().toISOString()
  });

  scrapeGoogleMaps({ city, maxResults, useMock })
    .then(result => {
      if (result.success) {
        console.log('\n✅ Scraper succeeded!');
        console.log(`   Leads captured: ${result.totalLeads}`);
        console.log(`   Unique leads: ${result.uniqueLeads}`);
        console.log(`   Duplicates: ${result.duplicates}`);
        console.log(`   Output: ${result.filename}`);
        console.log(`   Duration: ${result.duration}\n`);
        process.exit(0);
      } else {
        console.error('\n❌ Scraper failed!');
        console.error(`   Error: ${result.error}\n`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { scrapeGoogleMaps };
