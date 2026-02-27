/**
 * Google Maps Parser
 * Extracts business information from Google Maps HTML
 */

import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { normalizePhone } from '../validators/lead-validator.js';

/**
 * Extracts lead data from a business listing element
 * @param {string} html - HTML of a single business listing
 * @param {string} city - City name for context
 * @returns {Object} Parsed lead object
 */
const extractLeadFromElement = (element, $, city) => {
  try {
    // These selectors may need to be adjusted based on actual Google Maps structure
    const nameEl = $(element).find('[role="heading"]').first();
    const name = nameEl.text()?.trim() || '';

    // Phone extraction (often in attributes or specific divs)
    let phone = '';
    const phoneLink = $(element).find('a[href*="tel:"]').attr('href');
    if (phoneLink) {
      phone = phoneLink.replace('tel:', '').trim();
    }

    // Try alternative phone selectors
    if (!phone) {
      const phoneText = $(element).find('[data-item-id*="phone"]').text();
      phone = phoneText?.trim() || '';
    }

    // Website/URL
    let url = '';
    const linkEl = $(element).find('a[href*="maps.google"]').attr('href');
    if (linkEl) {
      url = linkEl;
    }

    // Address (often in secondary text area)
    let address = '';
    const addressText = $(element).find('[role="button"] > div').eq(1).text();
    if (addressText) {
      address = addressText.trim();
    }

    // Email (try to find in attributes or text)
    let email = '';
    const emailMatch = $(element).text().match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      email = emailMatch[0];
    }

    return {
      id: `gm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: 'google_maps',
      name,
      phone: phone || null,
      email: email || null,
      address,
      city,
      company_name: name,
      url: url || null,
      captured_at: new Date().toISOString(),
      is_valid: false, // Will be set during validation
      is_duplicate: false // Will be set during deduplication
    };
  } catch (error) {
    console.error('Error extracting lead from element:', error);
    return null;
  }
};

/**
 * Parses Google Maps HTML and extracts leads
 * Uses Puppeteer page content
 * @param {string} html - HTML content from Puppeteer
 * @param {string} city - City name for lead context
 * @returns {Array} Array of extracted leads
 */
export const parseGoogleMapsHTML = (html, city = 'São Paulo') => {
  const $ = cheerio.load(html);
  const leads = [];

  // Google Maps listings are typically in divs with specific data attributes
  // These selectors target business cards in the search results
  const listingSelectors = [
    '[data-item-id]',
    '[role="button"][data-business-status]',
    '.Nv2PK', // Common Google Maps class for business card
    '[jsaction*="mouseover"]'
  ];

  // Try multiple selectors to find business listings
  let elements = [];
  for (const selector of listingSelectors) {
    const found = $(selector);
    if (found.length > 0) {
      elements = found;
      break;
    }
  }

  // Extract lead from each element
  elements.each((index, element) => {
    const lead = extractLeadFromElement(element, $, city);
    if (lead && lead.name) {
      leads.push(lead);
    }
  });

  return leads;
};

/**
 * Extracts phone numbers from any text
 * @param {string} text - Text to search for phone numbers
 * @returns {string} First phone number found or null
 */
export const extractPhoneFromText = (text) => {
  if (!text) return null;

  // Brazilian phone patterns
  const patterns = [
    /\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})/, // (XX) XXXX-XXXX or (XX) XXXXX-XXXX
    /(\d{11})/, // Direct 11 digits
    /(\d{10})/, // 10 digits
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/\D/g, '');
    }
  }

  return null;
};

/**
 * Extracts email from any text
 * @param {string} text - Text to search for email
 * @returns {string} First email found or null
 */
export const extractEmailFromText = (text) => {
  if (!text) return null;

  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const matches = text.match(emailRegex);

  return matches ? matches[0] : null;
};

/**
 * Filters out leads with missing critical fields
 * @param {Array} leads - Array of leads to filter
 * @returns {Array} Filtered leads (must have name and phone)
 */
export const filterValidLeads = (leads) => {
  return leads.filter(lead =>
    lead.name && lead.name.trim().length > 0 &&
    (lead.phone || lead.email || lead.address)
  );
};
