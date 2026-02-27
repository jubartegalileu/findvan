/**
 * Google Maps Parser V2
 * Optimized extraction based on actual 2026 Google Maps HTML structure
 */

import * as cheerio from 'cheerio';

/**
 * Extracts all business listings from Google Maps HTML
 * @param {string} html - HTML content from Google Maps
 * @param {string} city - City name for context
 * @returns {Array} Array of extracted leads
 */
export const parseGoogleMapsHTML = (html, city = 'São Paulo') => {
  const $ = cheerio.load(html);
  const leads = [];

  // Primary selector: [role="button"] with .Nv2PK container (Google Maps 2026 structure)
  const resultSelectors = [
    { selector: '[role="button"][jsaction*="click"] .Nv2PK', name: 'Primary: .Nv2PK' },
    { selector: '[role="button"] .Nv2PK', name: 'Alt1: role=button .Nv2PK' },
    { selector: '[data-item-id] .Nv2PK', name: 'Alt2: data-item-id .Nv2PK' },
    { selector: 'div.Nv2PK', name: 'Alt3: div.Nv2PK' },
    { selector: '[role="button"]', name: 'Fallback: role=button' }
  ];

  let foundElements = null;
  let usedSelector = null;

  // Try selectors in order
  for (const { selector, name } of resultSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      console.log(`✓ Found ${elements.length} results with: ${name}`);
      foundElements = elements;
      usedSelector = selector;
      break;
    } else {
      console.log(`✗ No results with: ${name}`);
    }
  }

  if (!foundElements || foundElements.length === 0) {
    console.log('⚠️ No business results found in HTML');
    return [];
  }

  // Extract lead from each element
  foundElements.each((index, element) => {
    try {
      const $el = $(element);

      // Extract name (first heading-like text)
      const name = $el.find('.fontHeadlineSmall').first().text().trim() ||
                   $el.find('h1, h2, h3').first().text().trim() ||
                   '';

      if (!name || name.length < 2) {
        console.log(`  Skipping result ${index + 1}: no name found`);
        return;
      }

      // Extract phone - try multiple patterns
      let phone = '';

      // Look for phone in tel: links
      const telLink = $el.find('a[href*="tel:"]').attr('href');
      if (telLink) {
        phone = telLink.replace('tel:', '').trim();
      }

      // If no link, search in all text
      if (!phone) {
        const text = $el.text();

        // Brazilian phone patterns (11 digits)
        const patterns = [
          /\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})/,  // (11) 98765-4321 or 11 98765-4321
          /(\d{2})\s(\d{4,5})-?(\d{4})/,           // 11 98765-4321
          /(\d{11})/                                // 11987654321
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            phone = match[0].replace(/\D/g, '');
            if (phone.length === 11) break;
          }
        }
      }

      // Extract address (usually in second line of text)
      let address = '';
      const textBlocks = $el.find('.fontBodySmall').slice(1, 3);
      textBlocks.each((i, block) => {
        const text = $(block).text().trim();
        // Skip if it's a phone or email
        if (!text.match(/^\d+|@/) && !text.match(/★/)) {
          address = text;
          return false; // break
        }
      });

      // Extract email
      let email = '';
      const emailMatch = $el.text().match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        email = emailMatch[0];
      }

      // Extract URL if available
      let url = '';
      const link = $el.find('a[href*="maps"]').attr('href');
      if (link) {
        url = link;
      }

      // Create lead object only if we have minimum data
      if (name && (phone || email || address)) {
        leads.push({
          id: `gm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source: 'google_maps',
          name,
          phone: phone || null,
          email: email || null,
          address: address || '',
          city,
          company_name: name,
          cnpj: null,
          url: url || null,
          captured_at: new Date().toISOString(),
          is_valid: false, // Will be set during validation
          is_duplicate: false // Will be set during deduplication
        });

        console.log(`  ✓ Result ${leads.length}: ${name} (${phone || email || 'address only'})`);
      } else {
        console.log(`  ✗ Result ${index + 1}: incomplete data (${name})`);
      }
    } catch (error) {
      console.error(`  Error processing element ${index + 1}:`, error.message);
    }
  });

  console.log(`\n✓ Extracted ${leads.length} leads from ${foundElements.length} results`);
  return leads;
};

/**
 * Extracts phone numbers from any text
 * @param {string} text - Text to search
 * @returns {string} First phone number found or null
 */
export const extractPhoneFromText = (text) => {
  if (!text) return null;

  const patterns = [
    /\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})/,
    /(\d{11})/,
    /(\d{10})/
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
 * @param {string} text - Text to search
 * @returns {string} First email found or null
 */
export const extractEmailFromText = (text) => {
  if (!text) return null;

  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const matches = text.match(emailRegex);

  return matches ? matches[0] : null;
};

/**
 * Filters leads with minimum required fields
 * @param {Array} leads - Array of leads
 * @returns {Array} Filtered leads
 */
export const filterValidLeads = (leads) => {
  return leads.filter(lead =>
    lead.name && lead.name.trim().length > 0 &&
    (lead.phone || lead.email || lead.address)
  );
};
