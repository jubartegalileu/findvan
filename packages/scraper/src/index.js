#!/usr/bin/env node

/**
 * FindVan Scraper CLI Entry Point
 * Main orchestrator for all scraping operations
 */

import logger from './logger.js';
import { scrapeGoogleMaps } from './scrapers/google-maps.js';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

const help = () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║       FindVan OSINT Scraper - Lead Generation Tool           ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  npm run scraper:google-maps [city] [max-results]

COMMANDS:
  google-maps                  Scrape Google Maps (default)
  help                        Show this help message

OPTIONS:
  city                        City to search (default: São Paulo)
  max-results                 Maximum leads to capture (default: 100)

EXAMPLES:
  npm run scraper:google-maps
  npm run scraper:google-maps "Rio de Janeiro"
  npm run scraper:google-maps "São Paulo" 200

OUTPUT:
  data/raw-leads/{date}-google-maps.json
  logs/scraper/{date}-{time}.log

═════════════════════════════════════════════════════════════════
  `);
};

const main = async () => {
  try {
    switch (command.toLowerCase()) {
      case 'google-maps':
      case 'maps':
        {
          const city = args[1] || 'São Paulo';
          const maxResults = parseInt(args[2] || '100', 10);

          logger.info('🎬 Starting Google Maps scraper', {
            city,
            maxResults
          });

          const result = await scrapeGoogleMaps({
            city,
            maxResults
          });

          if (result.success) {
            console.log('\n✅ SCRAPER COMPLETE');
            console.log(`   Leads captured: ${result.totalLeads}`);
            console.log(`   Unique: ${result.uniqueLeads}`);
            console.log(`   Duplicates: ${result.duplicates}`);
            console.log(`   File: ${result.filename}`);
            console.log(`   Time: ${result.duration}`);
            console.log(`   Path: ${result.filePath}\n`);
          } else {
            console.error('\n❌ SCRAPER FAILED');
            console.error(`   Error: ${result.error}\n`);
            process.exit(1);
          }
        }
        break;

      case 'help':
      case '-h':
      case '--help':
      default:
        help();
        break;
    }
  } catch (error) {
    logger.error('Fatal error in CLI', { error: error.message });
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
};

main();
