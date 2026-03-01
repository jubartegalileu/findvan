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
  let cleaned = phone.replace(/\D/g, '');

  // Handle country code (+55XXXXXXXXXXX)
  if (cleaned.length >= 12 && cleaned.startsWith('55')) {
    cleaned = cleaned.slice(2);
  }

  // Accept only 11 digits in Brazil local format
  return cleaned.length === 11 && /^\d+$/.test(cleaned);
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

  const hasPhone = !!lead.phone;
  const hasEmail = !!lead.email;
  const hasAddress = !!lead.address;

  if (!hasPhone && !hasEmail && !hasAddress) {
    errors.push('Lead has no contact data (phone/email/address)');
  }

  if (hasPhone && !validatePhone(lead.phone)) {
    errors.push(`Invalid phone format: ${lead.phone}`);
  }

  if (!validateAddress(lead.address)) {
    errors.push('Invalid address');
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

  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.length >= 12 && cleaned.startsWith('55')) {
    cleaned = cleaned.slice(2);
  }

  // Accept only 11 digits
  if (cleaned.length === 11) {
    return cleaned;
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
