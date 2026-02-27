/**
 * Template Service - Message Template CRUD
 * Module 4 - WhatsApp SDR
 */

import { pool } from '../db/pool.js';
import { whatsappConfig } from '../config/whatsapp.js';

class TemplateService {
  async createTemplate(input) {
    const { name, content, variables = [] } = input;

    if (!name || name.length === 0) {
      throw new Error('Template name is required');
    }
    if (!content || content.length === 0) {
      throw new Error('Template content is required');
    }
    if (content.length > (whatsappConfig?.templates?.maxLength || 1000)) {
      throw new Error(`Template content exceeds max length of ${whatsappConfig?.templates?.maxLength || 1000}`);
    }

    const extractedVars = this.extractVariables(content);
    const finalVars = variables.length > 0 ? variables : extractedVars;

    try {
      const result = await pool.query(
        `INSERT INTO templates (name, content, variables, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
        [name, content, JSON.stringify(finalVars)],
      );

      return this.formatTemplate(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error(`Template with name "${name}" already exists`);
      }
      throw error;
    }
  }

  async getTemplateById(id) {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1 AND is_active = true', [id]);
    return result.rows.length > 0 ? this.formatTemplate(result.rows[0]) : null;
  }

  async getAllTemplates(activeOnly = true) {
    const query = activeOnly
      ? 'SELECT * FROM templates WHERE is_active = true ORDER BY is_default DESC, created_at DESC'
      : 'SELECT * FROM templates ORDER BY is_default DESC, created_at DESC';

    const result = await pool.query(query);
    return result.rows.map(row => this.formatTemplate(row));
  }

  async getDefaultTemplates() {
    const result = await pool.query(
      'SELECT * FROM templates WHERE is_default = true AND is_active = true ORDER BY created_at',
    );
    return result.rows.map(row => this.formatTemplate(row));
  }

  async updateTemplate(id, input) {
    const template = await this.getTemplateById(id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }

    if (input.content && input.content.length > (whatsappConfig?.templates?.maxLength || 1000)) {
      throw new Error(`Template content exceeds max length of ${whatsappConfig?.templates?.maxLength || 1000}`);
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(input.name);
      paramCount++;
    }

    if (input.content !== undefined) {
      updates.push(`content = $${paramCount}`);
      values.push(input.content);
      paramCount++;
    }

    if (input.variables !== undefined) {
      updates.push(`variables = $${paramCount}`);
      values.push(JSON.stringify(input.variables));
      paramCount++;
    }

    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(input.is_active);
      paramCount++;
    }

    if (updates.length === 0) {
      return template;
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    try {
      const result = await pool.query(
        `UPDATE templates SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values,
      );

      return this.formatTemplate(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error(`Template with name "${input.name}" already exists`);
      }
      throw error;
    }
  }

  async deleteTemplate(id) {
    const template = await this.getTemplateById(id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }

    if (template.is_default) {
      throw new Error('Cannot delete default templates');
    }

    await pool.query('UPDATE templates SET is_active = false WHERE id = $1', [id]);
  }

  substituteVariables(content, variables) {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value || '');
    }

    return result;
  }

  extractVariables(content) {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = new Set();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  validateVariablesForLead(template, leadData) {
    const missingVars = [];

    for (const variable of template.variables) {
      if (!(variable in leadData) || leadData[variable] === null) {
        missingVars.push(variable);
      }
    }

    return {
      valid: missingVars.length === 0,
      missingVars,
    };
  }

  formatTemplate(row) {
    return {
      id: row.id,
      name: row.name,
      content: row.content,
      variables: Array.isArray(row.variables) ? row.variables : [],
      is_default: row.is_default,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}

export const templateService = new TemplateService();
export default templateService;
