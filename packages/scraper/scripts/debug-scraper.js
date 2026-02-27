#!/usr/bin/env node

/**
 * Debug Script for Google Maps Scraper
 * Captures HTML and screenshots for debugging selector issues
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const main = async () => {
  const city = process.argv[2] || 'São Paulo';
  const debugDir = path.join(__dirname, '../debug');

  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  let browser;
  try {
    console.log(`\n🔍 Debugging Google Maps Scraper`);
    console.log(`   City: ${city}`);
    console.log(`   Debug dir: ${debugDir}\n`);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const url = `https://www.google.com/maps/search/transporte%20escolar%20${encodeURIComponent(city)}`;
    console.log(`📍 Navigating to: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    console.log(`⏳ Waiting for content to load...`);
    await page.waitForTimeout(3000);

    // Capture HTML
    const html = await page.content();
    const htmlFile = path.join(debugDir, `${city.replace(/\s+/g, '_')}-page.html`);
    fs.writeFileSync(htmlFile, html);
    console.log(`✅ HTML saved: ${htmlFile}`);

    // Capture screenshot
    const screenshotFile = path.join(debugDir, `${city.replace(/\s+/g, '_')}-page.png`);
    await page.screenshot({ path: screenshotFile, fullPage: false });
    console.log(`✅ Screenshot saved: ${screenshotFile}`);

    // Analyze selectors
    console.log(`\n📊 Selector Analysis:`);

    const selectors = [
      '[data-item-id]',
      '[role="button"][data-business-status]',
      '.Nv2PK',
      '[jsaction*="mouseover"]',
      '[role="listitem"]',
      '[role="button"]',
      'div[class*="listing"]',
      'div[class*="result"]'
    ];

    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      console.log(`  ${selector}: ${count} elements`);
    }

    // Get page structure info
    console.log(`\n📄 Page Structure:`);
    const bodyText = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.length;
    });
    console.log(`  Body text length: ${bodyText} chars`);

    // Check for maps iframe
    const hasIframe = await page.evaluate(() => {
      return !!document.querySelector('iframe');
    });
    console.log(`  Has iframe: ${hasIframe}`);

    // Check page URL after load
    const finalUrl = page.url();
    console.log(`  Final URL: ${finalUrl}`);

    console.log(`\n✅ Debug complete. Check ${debugDir} for files.\n`);

    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    if (browser) await browser.close();
    process.exit(1);
  }
};

main();
