/**
 * Lead Deduplicator
 * Detects and flags duplicate leads by phone number
 */

/**
 * Deduplicates leads by phone number
 * Keeps all records but flags duplicates
 * @param {Array} leads - Array of lead objects
 * @returns {Array} Leads with is_duplicate flag set
 */
export const deduplicateByPhone = (leads) => {
  const seenPhones = new Map();

  return leads.map((lead) => {
    const phone = lead.phone;

    if (!phone) {
      // No phone, can't deduplicate
      return { ...lead, is_duplicate: false };
    }

    if (seenPhones.has(phone)) {
      // This phone was seen before
      return { ...lead, is_duplicate: true };
    }

    // First occurrence of this phone
    seenPhones.set(phone, true);
    return { ...lead, is_duplicate: false };
  });
};

/**
 * Counts duplicates in a lead array
 * @param {Array} leads - Array of lead objects with is_duplicate flag
 * @returns {Object} { total, duplicates, unique }
 */
export const countDuplicates = (leads) => {
  const duplicates = leads.filter(l => l.is_duplicate).length;
  const total = leads.length;
  const unique = total - duplicates;

  return {
    total,
    duplicates,
    unique,
    duplicatePercentage: total > 0 ? ((duplicates / total) * 100).toFixed(2) : 0
  };
};

/**
 * Filters out duplicates (returns only unique leads)
 * @param {Array} leads - Array of lead objects with is_duplicate flag
 * @returns {Array} Only unique leads
 */
export const filterUnique = (leads) => {
  return leads.filter(l => !l.is_duplicate);
};
