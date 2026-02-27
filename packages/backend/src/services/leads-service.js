import { query, getClient } from '../db/pool.js';

/**
 * LeadsService - Database operations for leads
 * Handles insertion, querying, and deduplication of lead data
 */

/**
 * Insert leads into database with deduplication
 * @param {array} leads - Array of lead objects
 * @param {string} source - Source of the leads
 * @returns {Promise} Object with inserted, duplicate, and error counts
 */
export async function insertLeads(leads, source) {
  const results = {
    inserted: 0,
    duplicate: 0,
    errors: 0,
    details: []
  };

  if (!Array.isArray(leads) || leads.length === 0) {
    return results;
  }

  // Process in batches of 1000
  const batchSize = 1000;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);

      for (const lead of batch) {
        try {
          // Validate required fields
          if (!lead.name || !lead.city) {
            results.errors++;
            results.details.push({
              phone: lead.phone,
              error: 'Missing required fields (name, city)'
            });
            continue;
          }

          // Validate phone format (11 digits if present)
          if (lead.phone && !/^\d{11}$/.test(lead.phone.replace(/\D/g, ''))) {
            results.errors++;
            results.details.push({
              phone: lead.phone,
              error: 'Invalid phone format'
            });
            continue;
          }

          // Try to insert lead
          const result = await client.query(
            `INSERT INTO leads (source, name, phone, email, address, city, company_name, cnpj, url, is_valid)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (phone, source) DO NOTHING
             RETURNING id`,
            [
              source,
              lead.name,
              lead.phone || null,
              lead.email || null,
              lead.address || null,
              lead.city,
              lead.company_name || lead.name,
              lead.cnpj || null,
              lead.url || null,
              lead.is_valid !== false
            ]
          );

          if (result.rows.length > 0) {
            results.inserted++;
          } else {
            // Duplicate detected
            results.duplicate++;
          }
        } catch (error) {
          results.errors++;
          results.details.push({
            phone: lead.phone,
            error: error.message
          });
        }
      }
    }

    // Mark duplicates in batch
    await client.query(`
      UPDATE leads
      SET is_duplicate = TRUE
      WHERE phone IN (
        SELECT phone
        FROM leads
        WHERE phone IS NOT NULL
        GROUP BY phone
        HAVING COUNT(*) > 1
      )
      AND is_duplicate = FALSE
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Transaction failed: ${error.message}`);
  } finally {
    client.release();
  }

  return results;
}

/**
 * Get leads by city with pagination
 * @param {string} city - City name
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @returns {Promise} Object with leads, pagination info
 */
export async function getLeadsByCity(city, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) as total FROM leads WHERE city = $1',
    [city]
  );
  const total = parseInt(countResult.rows[0].total, 10);
  const pages = Math.ceil(total / limit);

  const result = await query(
    `SELECT id, source, name, phone, email, city, company_name, is_valid, is_duplicate, created_at
     FROM leads
     WHERE city = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [city, limit, offset]
  );

  return {
    leads: result.rows,
    total,
    page,
    pages,
    limit
  };
}

/**
 * Get lead by phone number
 * @param {string} phone - Phone number
 * @returns {Promise} Lead object or null
 */
export async function getLeadByPhone(phone) {
  const result = await query(
    `SELECT * FROM leads WHERE phone = $1 LIMIT 1`,
    [phone]
  );

  return result.rows[0] || null;
}

/**
 * Get leads by source
 * @param {string} source - Source name
 * @param {number} limit - Maximum results
 * @returns {Promise} Array of leads
 */
export async function getLeadsBySource(source, limit = 100) {
  const result = await query(
    `SELECT id, source, name, phone, email, city, company_name, is_valid, is_duplicate, created_at
     FROM leads
     WHERE source = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [source, limit]
  );

  return result.rows;
}

/**
 * Get valid leads (passed validation)
 * @param {string} city - Optional city filter
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @returns {Promise} Object with leads and pagination info
 */
export async function getValidLeads(city = null, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  let countQuery = 'SELECT COUNT(*) as total FROM leads WHERE is_valid = TRUE';
  let selectQuery = `SELECT id, source, name, phone, email, city, company_name, is_duplicate, created_at
                    FROM leads
                    WHERE is_valid = TRUE`;
  const params = [];

  if (city) {
    countQuery += ' AND city = $1';
    selectQuery += ' AND city = $1';
    params.push(city);
  }

  const countResult = await query(countQuery, city ? [city] : []);
  const total = parseInt(countResult.rows[0].total, 10);
  const pages = Math.ceil(total / limit);

  selectQuery += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
  params.push(limit, offset);

  const result = await query(selectQuery, params);

  return {
    leads: result.rows,
    total,
    page,
    pages,
    limit,
    is_valid: true
  };
}

/**
 * Get duplicate leads grouped by phone
 * @returns {Promise} Array of duplicate groups
 */
export async function getDuplicates() {
  const result = await query(
    `SELECT
      phone,
      COUNT(*) as count,
      ARRAY_AGG(id ORDER BY created_at DESC) as lead_ids,
      ARRAY_AGG(name) as names,
      ARRAY_AGG(source) as sources,
      ARRAY_AGG(created_at) as created_ats
     FROM leads
     WHERE phone IS NOT NULL AND is_duplicate = TRUE
     GROUP BY phone
     HAVING COUNT(*) > 1
     ORDER BY count DESC`,
    []
  );

  return result.rows.map(row => ({
    phone: row.phone,
    count: parseInt(row.count, 10),
    records: row.lead_ids.map((id, idx) => ({
      id,
      name: row.names[idx],
      source: row.sources[idx],
      created_at: row.created_ats[idx]
    }))
  }));
}

/**
 * Merge duplicate leads, keeping best record and deleting others
 * @param {string} phone - Phone number
 * @param {number} keepId - ID of record to keep
 * @returns {Promise} Object with merge results
 */
export async function mergeDuplicates(phone, keepId) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get all records with this phone
    const allRecords = await client.query(
      'SELECT id, source, name, email, address, company_name, cnpj, url FROM leads WHERE phone = $1 ORDER BY created_at DESC',
      [phone]
    );

    if (allRecords.rows.length <= 1) {
      await client.query('ROLLBACK');
      return { merged: 0, deleted: 0 };
    }

    // Verify keepId exists
    const keepRecord = allRecords.rows.find(r => r.id === keepId);
    if (!keepRecord) {
      await client.query('ROLLBACK');
      throw new Error(`Record with ID ${keepId} not found`);
    }

    // Merge data from other records into keep record
    let mergedData = { ...keepRecord };

    for (const record of allRecords.rows) {
      if (record.id === keepId) continue;

      // Fill in empty fields from other records
      if (!mergedData.email && record.email) mergedData.email = record.email;
      if (!mergedData.address && record.address) mergedData.address = record.address;
      if (!mergedData.company_name && record.company_name) mergedData.company_name = record.company_name;
      if (!mergedData.cnpj && record.cnpj) mergedData.cnpj = record.cnpj;
      if (!mergedData.url && record.url) mergedData.url = record.url;
    }

    // Update keep record with merged data
    await client.query(
      `UPDATE leads
       SET email = $1, address = $2, company_name = $3, cnpj = $4, url = $5, is_duplicate = FALSE
       WHERE id = $6`,
      [mergedData.email, mergedData.address, mergedData.company_name, mergedData.cnpj, mergedData.url, keepId]
    );

    // Delete other records
    const deleteResult = await client.query(
      'DELETE FROM leads WHERE phone = $1 AND id != $2',
      [phone, keepId]
    );

    const deletedCount = deleteResult.rowCount;

    await client.query('COMMIT');

    return {
      merged: 1,
      deleted: deletedCount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Merge failed: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Get database statistics
 * @returns {Promise} Statistics object
 */
export async function getStats() {
  const result = await query(
    `SELECT
      COUNT(*) as total_leads,
      COUNT(DISTINCT source) as sources,
      COUNT(DISTINCT city) as cities,
      COUNT(CASE WHEN is_valid THEN 1 END) as valid_leads,
      COUNT(CASE WHEN is_duplicate THEN 1 END) as duplicate_leads,
      COUNT(DISTINCT phone) as unique_phones
     FROM leads`,
    []
  );

  const row = result.rows[0];
  return {
    total_leads: parseInt(row.total_leads, 10),
    sources: parseInt(row.sources, 10),
    cities: parseInt(row.cities, 10),
    valid_leads: parseInt(row.valid_leads, 10),
    duplicate_leads: parseInt(row.duplicate_leads, 10),
    unique_phones: parseInt(row.unique_phones, 10)
  };
}

/**
 * Clear all leads (for testing)
 * @returns {Promise} Number of deleted records
 */
export async function clearLeads() {
  const result = await query('DELETE FROM leads', []);
  return result.rowCount;
}
