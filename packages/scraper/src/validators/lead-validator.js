/**
 * Lead Validator
 * Validates lead data according to schema requirements
 */

/**
 * Validates Brazilian phone number (11 digits)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} true if valid, false otherwise
 */
export const validatePhone = (phone) => {
  if (!phone) return false;

  // Remove non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Check if 11 digits (Brazil format)
  return cleaned.length === 11 && /^\d{11}$/.test(cleaned);
};

/**
 * Validates email format (basic check)
 * @param {string} email - Email to validate
 * @returns {boolean} true if valid, false if empty (optional field)
 */
export const validateEmail = (email) => {
  if (!email) return true; // Email is optional

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates address (non-empty)
 * @param {string} address - Address to validate
 * @returns {boolean} true if non-empty
 */
export const validateAddress = (address) => {
  if (!address) return false;
  return address.trim().length > 0;
};

/**
 * Validates complete lead object
 * @param {Object} lead - Lead object to validate
 * @returns {Object} { isValid, errors }
 */
export const validateLead = (lead) => {
  const errors = [];

  if (!lead.name || lead.name.trim().length === 0) {
    errors.push('Missing or empty name');
  }

  if (!validatePhone(lead.phone)) {
    errors.push(`Invalid phone format: ${lead.phone}`);
  }

  if (!validateAddress(lead.address)) {
    errors.push('Missing or empty address');
  }

  if (lead.email && !validateEmail(lead.email)) {
    errors.push(`Invalid email format: ${lead.email}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Cleans and normalizes phone number to 11 digits
 * @param {string} phone - Raw phone input
 * @returns {string} Normalized phone (11 digits) or null if invalid
 */
export const normalizePhone = (phone) => {
  if (!phone) return null;

  const cleaned = phone.replace(/\D/g, '');

  // Handle Brazilian format: if 10 digits, assume missing first area code digit
  // If 11 digits, return as-is
  if (cleaned.length === 11) {
    return cleaned;
  } else if (cleaned.length === 10) {
    // Add missing digit (assuming local format without area code)
    return null; // Invalid
  }

  return null;
};

/**
 * Cleans lead data (trim strings, normalize phone)
 * @param {Object} lead - Raw lead data
 * @returns {Object} Cleaned lead data
 */
export const cleanLead = (lead) => {
  return {
    ...lead,
    name: lead.name ? lead.name.trim() : '',
    phone: normalizePhone(lead.phone),
    email: lead.email ? lead.email.trim().toLowerCase() : '',
    address: lead.address ? lead.address.trim() : '',
    city: lead.city ? lead.city.trim() : '',
    company_name: lead.company_name ? lead.company_name.trim() : '',
  };
};
