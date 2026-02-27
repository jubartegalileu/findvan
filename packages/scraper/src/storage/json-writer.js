/**
 * JSON Writer
 * Writes leads to JSON file with metadata
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data/raw-leads');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Generates filename with current date
 * @returns {string} Filename like 2026-02-27-google-maps.json
 */
const generateFilename = (source = 'google-maps') => {
  const date = new Date().toISOString().split('T')[0];
  return `${date}-${source}.json`;
};

/**
 * Writes leads to JSON file with metadata
 * @param {Array} leads - Array of lead objects
 * @param {string} source - Source name (default: google-maps)
 * @returns {Object} { filePath, count, duplicates, unique }
 */
export const writeLeadsToJSON = (leads, source = 'google-maps') => {
  const filename = generateFilename(source);
  const filePath = path.join(dataDir, filename);

  // Count duplicates
  const duplicates = leads.filter(l => l.is_duplicate).length;
  const unique = leads.length - duplicates;

  // Build output object with metadata
  const output = {
    metadata: {
      source,
      captured_at: new Date().toISOString(),
      total_leads: leads.length,
      unique_leads: unique,
      duplicate_leads: duplicates,
      file_version: '1.0'
    },
    leads: leads
  };

  // Write to file
  fs.writeFileSync(
    filePath,
    JSON.stringify(output, null, 2),
    'utf-8'
  );

  return {
    filePath,
    filename,
    count: leads.length,
    unique,
    duplicates
  };
};

/**
 * Reads leads from JSON file
 * @param {string} filename - Filename to read from data/raw-leads/
 * @returns {Array} Array of leads
 */
export const readLeadsFromJSON = (filename) => {
  const filePath = path.join(dataDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  return data.leads || [];
};

/**
 * Lists all lead JSON files in the data directory
 * @returns {Array} Array of filenames
 */
export const listLeadFiles = () => {
  if (!fs.existsSync(dataDir)) {
    return [];
  }

  return fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .reverse(); // Newest first
};
