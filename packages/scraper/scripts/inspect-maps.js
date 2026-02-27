#!/usr/bin/env node

/**
 * Google Maps HTML Inspector
 * Analyzes actual DOM structure to find correct selectors
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const main = async () => {
  const city = process.argv[2] || 'São Paulo';
  const debugDir = path.join(__dirname, '../debug');

  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  let browser;
  try {
    console.log(`\n🔍 Inspecting Google Maps HTML Structure`);
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
    console.log(`📍 Loading: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Get full HTML
    const html = await page.content();

    // Analyze DOM structure with page.evaluate
    const structure = await page.evaluate(() => {
      const analysis = {
        businessElements: [],
        allElements: [],
        selectors: {}
      };

      // Find all divs with role="button"
      const buttons = document.querySelectorAll('[role="button"]');
      console.log(`Found ${buttons.length} role=button elements`);

      // Find all article elements
      const articles = document.querySelectorAll('article');
      console.log(`Found ${articles.length} article elements`);

      // Find specific Google Maps structures
      const maps_results = document.querySelectorAll('[data-item-id]');
      console.log(`Found ${maps_results.length} [data-item-id] elements`);

      // Check for specific classes
      const mapElements = document.querySelectorAll('div[class*="HwAqf"]');
      console.log(`Found ${mapElements.length} HwAqf elements`);

      // Alternative: Look for business names in headings
      const headings = document.querySelectorAll('h1, h2, h3');
      console.log(`Found ${headings.length} heading elements`);

      // Get text content to understand structure
      let businessCount = 0;
      const allText = document.body.innerText;
      const lines = allText.split('\n').slice(0, 100);

      // Sample the first few business results
      buttons.forEach((btn, i) => {
        if (i < 5) {
          const text = btn.innerText || '';
          if (text.length > 10) {
            analysis.businessElements.push({
              index: i,
              text: text.substring(0, 100),
              classes: btn.className,
              dataAttrs: Array.from(btn.attributes)
                .filter(a => a.name.startsWith('data-'))
                .map(a => `${a.name}=${a.value}`)
            });
          }
        }
      });

      // Check for result containers
      const resultContainers = [
        { selector: '[role="listbox"]', count: document.querySelectorAll('[role="listbox"]').length },
        { selector: '[role="region"]', count: document.querySelectorAll('[role="region"]').length },
        { selector: 'article', count: document.querySelectorAll('article').length },
        { selector: '.Nv2PK', count: document.querySelectorAll('.Nv2PK').length },
        { selector: 'div[jsname]', count: document.querySelectorAll('div[jsname]').length }
      ];

      return {
        businessElements: analysis.businessElements,
        resultContainers,
        totalButtons: buttons.length,
        totalArticles: articles.length,
        bodyTextLength: allText.length,
        firstLines: lines
      };
    });

    console.log('\n📊 DOM Structure Analysis:');
    console.log(JSON.stringify(structure, null, 2));

    // Save full HTML for manual inspection
    const htmlFile = path.join(debugDir, `${city.replace(/\s+/g, '_')}-full.html`);
    fs.writeFileSync(htmlFile, html);
    console.log(`\n✅ Full HTML saved: ${htmlFile}`);

    // Save analysis
    const analysisFile = path.join(debugDir, `${city.replace(/\s+/g, '_')}-analysis.json`);
    fs.writeFileSync(analysisFile, JSON.stringify(structure, null, 2));
    console.log(`✅ Analysis saved: ${analysisFile}`);

    // Get screenshot
    const screenshotFile = path.join(debugDir, `${city.replace(/\s+/g, '_')}-page.png`);
    await page.screenshot({ path: screenshotFile, fullPage: false });
    console.log(`✅ Screenshot saved: ${screenshotFile}`);

    console.log(`\n📝 Recommendations:`);
    console.log(`   1. Open ${htmlFile} in browser to inspect elements manually`);
    console.log(`   2. Use browser DevTools to find business result selectors`);
    console.log(`   3. Look for patterns in class names and data attributes`);
    console.log(`   4. Test selectors in browser console before updating parser\n`);

    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (browser) await browser.close();
    process.exit(1);
  }
};

main();
