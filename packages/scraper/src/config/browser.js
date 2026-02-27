/**
 * Browser Configuration for Puppeteer
 * Defines default browser launch options and behavior
 */

import dotenv from 'dotenv';
dotenv.config();

const browserConfig = {
  headless: process.env.PUPPETEER_HEADLESS !== 'false',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
  ],
  timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS || '30000', 10),
};

const navigationOptions = {
  waitUntil: 'networkidle2',
  timeout: parseInt(process.env.SCRAPER_TIMEOUT_MS || '30000', 10),
};

const defaultScraperConfig = {
  delay: parseInt(process.env.SCRAPER_DELAY_MS || '1000', 10),
  retries: parseInt(process.env.SCRAPER_RETRY_COUNT || '3', 10),
  headless: browserConfig.headless,
};

export { browserConfig, navigationOptions, defaultScraperConfig };
