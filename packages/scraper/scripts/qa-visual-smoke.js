#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

const dashboardBase = process.argv[2];
const outputDir = process.argv[3];

if (!dashboardBase || !outputDir) {
  console.error('Usage: node qa-visual-smoke.js <dashboardBase> <outputDir>');
  process.exit(2);
}

const routes = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'scraper', path: '/scraper' },
  { name: 'leads', path: '/leads' },
  { name: 'whatsapp', path: '/whatsapp' },
  { name: 'campaigns', path: '/campaigns' },
];

const screenshotsDir = path.join(outputDir, 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const summary = {
  generated_at: new Date().toISOString(),
  base_url: dashboardBase,
  checks: [],
  totals: {
    routes: routes.length,
    pass: 0,
    fail: 0,
    console_errors: 0,
    request_failures: 0,
  },
};

let browser;

try {
  browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  const consoleErrors = [];
  const requestFailures = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    requestFailures.push({
      url: req.url(),
      method: req.method(),
      error: failure?.errorText || 'requestfailed',
    });
  });

  for (const route of routes) {
    const url = `${dashboardBase}${route.path}`;
    let check = {
      name: route.name,
      route: route.path,
      url,
      status: 'pass',
      note: 'ok',
      screenshot: `${route.name}.png`,
      http_status: null,
    };

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      check.http_status = response?.status?.() ?? null;
      if (!response || response.status() >= 400) {
        check.status = 'fail';
        check.note = `http status ${check.http_status ?? 'null'}`;
      }

      const screenshotPath = path.join(screenshotsDir, `${route.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (err) {
      check.status = 'fail';
      check.note = String(err?.message || err || 'navigation failed');
    }

    summary.checks.push(check);
    if (check.status === 'pass') {
      summary.totals.pass += 1;
    } else {
      summary.totals.fail += 1;
    }
  }

  summary.totals.console_errors = consoleErrors.length;
  summary.totals.request_failures = requestFailures.length;
  summary.console_errors = consoleErrors.slice(0, 50);
  summary.request_failures = requestFailures.slice(0, 100);

  fs.writeFileSync(path.join(outputDir, 'visual-summary.json'), JSON.stringify(summary, null, 2));

  if (summary.totals.fail > 0 || summary.totals.console_errors > 0 || summary.totals.request_failures > 0) {
    process.exit(1);
  }

  process.exit(0);
} catch (err) {
  const fallback = {
    generated_at: new Date().toISOString(),
    base_url: dashboardBase,
    fatal_error: String(err?.message || err || 'visual smoke failed'),
  };
  fs.writeFileSync(path.join(outputDir, 'visual-summary.json'), JSON.stringify(fallback, null, 2));
  process.exit(1);
} finally {
  if (browser) {
    await browser.close();
  }
}
