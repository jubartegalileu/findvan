#!/usr/bin/env node

/**
 * Google Maps Scraper
 * Captures school transportation business leads from Google Maps
 */

import { File } from 'node:buffer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import logger from '../logger.js';
import { defaultScraperConfig, browserConfig, navigationOptions } from '../config/browser.js';

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());
// Polyfill File for undici on Node 18
if (!globalThis.File) {
  globalThis.File = File;
}
import { normalizePhone, validateLead, cleanLead } from '../validators/lead-validator.js';
import { deduplicateByPhone, countDuplicates } from '../validators/deduplicator.js';
import { writeLeadsToJSON } from '../storage/json-writer.js';

/**
 * Main scraper function
 * @param {Object} options - Scraper options
 * @returns {Object} Results with lead count and file info
 */
async function scrapeGoogleMaps(options = {}) {
  const {
    city = 'São Paulo',
    keyword = 'transporte escolar',
    maxResults = 100,
    delay = defaultScraperConfig.delay
  } = options;

  const startTime = new Date();
  logger.info(`🚀 Starting Google Maps scraper for "${keyword}" in ${city}`, {
    city,
    keyword,
    maxResults,
    timestamp: startTime.toISOString()
  });

  let browser;
  let page;
  const leads = [];

  try {
    // Launch browser
    logger.info('📱 Launching Puppeteer browser');
    browser = await puppeteer.launch(browserConfig);
    page = await browser.newPage();

    // Set viewport for realistic interaction
    await page.setViewport({ width: 1280, height: 720 });

    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Navigate to Google Maps
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${keyword} ${city}`)}`;
    logger.info(`🗺️ Navigating to Google Maps search`, { url: mapsUrl });

    await page.goto(mapsUrl, navigationOptions);

    // Wait for results to load
    await page.waitForSelector('a[href*="/maps/place/"], [role="feed"], [role="main"]', {
      timeout: 10000
    }).catch(() => {
      logger.warn('⚠️ Could not find exact selector, trying alternatives');
    });

    // Scroll to load more results
    let previousHeight = 0;
    let scrollCount = 0;
    const maxScrolls = 12;

    logger.info('📜 Scrolling to load results');

    while (scrollCount < maxScrolls && leads.length < maxResults) {
      // Scroll down in results panel
      const scrollHeight = await page.evaluate(
        () => {
          const panel =
            document.querySelector('[role="feed"]') ||
            document.querySelector('[role="region"][aria-label*="Result"]') ||
            document.querySelector('div[role="main"]');
          return panel?.scrollHeight || 0;
        }
      );

      if (scrollHeight === previousHeight && scrollCount > 0) {
        logger.info('✓ Reached end of results list');
        break;
      }

      await page.evaluate(
        () => {
          const resultsPanel =
            document.querySelector('[role="feed"]') ||
            document.querySelector('[role="region"][aria-label*="Result"]') ||
            document.querySelector('div[role="main"]');
          if (resultsPanel) resultsPanel.scrollBy(0, 500);
        }
      );

      previousHeight = scrollHeight;
      scrollCount++;

      // Wait between scrolls
      await page.waitForTimeout(delay);

      // Extract currently visible leads using page.evaluate()
      const newLeads = await page.evaluate((city) => {
        const leads = [];
        const placeLinks = document.querySelectorAll('a[href*="/maps/place/"]');

        placeLinks.forEach((link) => {
          try {
            const card =
              link.closest('div[role="article"]') ||
              link.closest('.Nv2PK') ||
              link.closest('div[jsaction*="mouseover"]') ||
              link.parentElement;

            const text = (card?.innerText || link.innerText || '').trim();
            const lines = text.split('\n');

            // Name from aria-label usually works better than generic first line.
            const name = (link.getAttribute('aria-label') || lines[0] || '').trim();
            if (!name || name.length < 2) return;

            // Look for phone in text or attributes
            let phone = '';
            let email = '';
            let address = '';

            // BR phone patterns with optional +55
            const phoneMatch = text.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
            if (phoneMatch) {
              phone = phoneMatch[0].replace(/\D/g, '');
            }

            // Check for email pattern
            const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (emailMatch) {
              email = emailMatch[0];
            }

            // Address heuristic from lines mentioning street markers.
            const addressLine = lines.find((line) =>
              /(rua|r\.|avenida|av\.|estrada|rodovia|travessa|alameda)/i.test(line)
            );
            if (addressLine) {
              address = addressLine.trim();
            } else if (lines.length > 1) {
              address = lines.slice(1, 3).join(' ').trim();
            }

            // Create lead object
            if (name && (phone || email || address)) {
              leads.push({
                name,
                phone: phone || null,
                email: email || null,
                address: address || '',
                city: city,
                url: link.href || null
              });
            }
          } catch (e) {
            // Skip problematic elements
          }
        });

        return leads;
      }, city);

      // Add new leads (avoid duplicates from same fetch)
      for (const lead of newLeads) {
        const exists = leads.some((l) => {
          if (lead.phone && l.phone) return l.phone === lead.phone;
          return (
            l.name?.toLowerCase() === lead.name?.toLowerCase() &&
            (l.address || '').toLowerCase() === (lead.address || '').toLowerCase()
          );
        });
        if (!exists && leads.length < maxResults) {
          leads.push({
            id: `gm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: 'google_maps',
            ...lead,
            company_name: lead.name,
            cnpj: null,
            captured_at: new Date().toISOString(),
            is_valid: false,
            is_duplicate: false
          });
          if (leads.length % 10 === 0) {
            logger.info(`✓ Extracted ${leads.length} leads so far`);
          }
        }
      }
    }

    logger.info(`✓ Extracted ${leads.length} raw leads from Google Maps`);

    // Clean leads
    logger.info('🧹 Cleaning lead data');
    const cleanedLeads = leads.map(cleanLead);

    // Validate each lead
    logger.info('✔️ Validating leads');
    const validatedLeads = cleanedLeads.map(lead => {
      const validation = validateLead(lead);
      return {
        ...lead,
        is_valid: validation.isValid,
        validation_errors: validation.errors
      };
    });

    // Filter to valid leads only
    const filteredLeads = validatedLeads.filter(l => l.is_valid);
    logger.info(`✓ ${filteredLeads.length} leads passed validation`);

    // Deduplicate
    logger.info('🔍 Detecting duplicates');
    const deduplicatedLeads = deduplicateByPhone(filteredLeads);
    const dupStats = countDuplicates(deduplicatedLeads);
    logger.info(`✓ Deduplication complete: ${dupStats.unique} unique, ${dupStats.duplicates} duplicates`, dupStats);

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
    // Close browser
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
      logger.info('🔌 Browser closed');
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const city = process.argv[2] || 'São Paulo';
  const maxResults = parseInt(process.argv[3] || '100', 10);

  logger.info('🎬 Google Maps Scraper started', {
    city,
    maxResults,
    timestamp: new Date().toISOString()
  });

  scrapeGoogleMaps({ city, maxResults })
    .then(result => {
      if (result.success) {
        console.log('\n✅ Scraper succeeded!');
        console.log(`   Leads captured: ${result.totalLeads}`);
        console.log(`   Unique leads: ${result.uniqueLeads}`);
        console.log(`   Duplicates: ${result.duplicates}`);
        console.log(`   Output: ${result.filename}`);
        console.log(`   Duration: ${result.duration}`);
        process.exit(0);
      } else {
        console.error('\n❌ Scraper failed!');
        console.error(`   Error: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { scrapeGoogleMaps };
