/**
 * Browser Configuration for Puppeteer
 * Defines default browser launch options and behavior
 */

import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

dotenv.config();

const userDataDir =
  process.env.SCRAPER_USER_DATA_DIR ||
  path.join(os.tmpdir(), 'findvan-puppeteer');

const headlessMode =
  process.env.PUPPETEER_HEADLESS === 'true' ? 'new' : 'new'; // força headless moderno

const browserConfig = {
  headless: headlessMode,
  userDataDir,
  ...(process.env.PUPPETEER_EXECUTABLE_PATH
    ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
    : {}),
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-crashpad',
    '--disable-features=Crashpad'
  ],
  timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS || '60000', 10),
};

const navigationOptions = {
  waitUntil: 'networkidle2',
  timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS || '60000', 10),
};

const defaultScraperConfig = {
  delay: parseInt(process.env.SCRAPER_DELAY_MS || '2500', 10),
  retries: parseInt(process.env.SCRAPER_RETRY_COUNT || '3', 10),
  headless: headlessMode,
};

export { browserConfig, navigationOptions, defaultScraperConfig };