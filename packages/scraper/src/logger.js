/**
 * Winston Logger Configuration
 * Logs to both console and file
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../../logs/scraper');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Generate log filename with date
const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const timeStr = now.toISOString().split('T')[1].replace(/:/g, '-').slice(0, 8);
const logFilename = `scraper-${dateStr}-${timeStr}.log`;
const logPath = path.join(logsDir, logFilename);

const logger = winston.createLogger({
  level: process.env.SCRAPER_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'scraper' },
  transports: [
    // File transport
    new winston.transports.File({
      filename: logPath,
      level: 'info'
    }),
    // Error file transport
    new winston.transports.File({
      filename: path.join(logsDir, `scraper-${dateStr}-errors.log`),
      level: 'error'
    })
  ]
});

// Add console transport if not in production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
export { logPath };
