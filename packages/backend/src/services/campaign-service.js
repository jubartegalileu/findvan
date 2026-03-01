/**
 * Campaign Service - Campaign Management & Execution
 * Module 4 - WhatsApp SDR
 */

import { pool } from '../db/pool.js';
import { templateService } from './template-service.js';
import { queueService } from './queue-service.js';
import { whatsappConfig } from '../config/whatsapp.js';

class CampaignService {
  async createCampaign(input) {
    const {
      name,
      description,
      template_id,
      filters = {},
      schedule_config = { type: 'immediate' },
      rate_limit_per_minute = whatsappConfig?.rateLimit?.messagesPerMinute || 5,
    } = input;

    if (!name || name.length === 0) {
      throw new Error('Campaign name is required');
    }

    const template = await templateService.getTemplateById(template_id);
    if (!template) {
      throw new Error(`Template with ID ${template_id} not found`);
    }

    if (rate_limit_per_minute <= 0 || rate_limit_per_minute > 100) {
      throw new Error('Rate limit must be between 1 and 100 messages per minute');
    }

    try {
      const result = await pool.query(
        `INSERT INTO campaigns (name, description, template_id, filters, schedule_config, rate_limit_per_minute, stats)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          name,
          description || null,
          template_id,
          JSON.stringify(filters),
          JSON.stringify(schedule_config),
          rate_limit_per_minute,
          JSON.stringify({
            total: 0,
            sent: 0,
            delivered: 0,
            failed: 0,
            responded: 0,
          }),
        ],
      );

      return this.formatCampaign(result.rows[0]);
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  async getCampaignById(id) {
    const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.formatCampaign(result.rows[0]) : null;
  }

  async getAllCampaigns(page = 1, limit = 25, status) {
    const offset = (page - 1) * limit;

    const countResult = status
      ? await pool.query('SELECT COUNT(*) FROM campaigns WHERE status = $1', [status])
      : await pool.query('SELECT COUNT(*) FROM campaigns');

    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / limit);

    const query = status
      ? 'SELECT * FROM campaigns WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3'
      : 'SELECT * FROM campaigns ORDER BY created_at DESC LIMIT $1 OFFSET $2';

    const queryParams = status ? [status, limit, offset] : [limit, offset];
    const result = await pool.query(query, queryParams);

    return {
      campaigns: result.rows.map(row => this.formatCampaign(row)),
      total,
      pages,
    };
  }

  async updateCampaign(id, input) {
    const campaign = await this.getCampaignById(id);
    if (!campaign) {
      throw new Error(`Campaign with ID ${id} not found`);
    }

    if (campaign.status !== 'draft' && input.status === undefined) {
      throw new Error('Can only update draft campaigns');
    }

    if (input.template_id) {
      const template = await templateService.getTemplateById(input.template_id);
      if (!template) {
        throw new Error(`Template with ID ${input.template_id} not found`);
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(input.name);
      paramCount++;
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(input.description || null);
      paramCount++;
    }

    if (input.template_id !== undefined) {
      updates.push(`template_id = $${paramCount}`);
      values.push(input.template_id);
      paramCount++;
    }

    if (input.filters !== undefined) {
      updates.push(`filters = $${paramCount}`);
      values.push(JSON.stringify(input.filters));
      paramCount++;
    }

    if (input.schedule_config !== undefined) {
      updates.push(`schedule_config = $${paramCount}`);
      values.push(JSON.stringify(input.schedule_config));
      paramCount++;
    }

    if (input.rate_limit_per_minute !== undefined) {
      updates.push(`rate_limit_per_minute = $${paramCount}`);
      values.push(input.rate_limit_per_minute);
      paramCount++;
    }

    if (input.status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(input.status);
      paramCount++;

      if (input.status === 'active' && !campaign.started_at) {
        updates.push('started_at = NOW()');
      }

      if (input.status === 'completed' && !campaign.completed_at) {
        updates.push('completed_at = NOW()');
      }
    }

    if (updates.length === 0) {
      return campaign;
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE campaigns SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values,
    );

    return this.formatCampaign(result.rows[0]);
  }

  async launchCampaign(campaignId) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.status !== 'draft') {
      throw new Error('Only draft campaigns can be launched');
    }

    const template = await templateService.getTemplateById(campaign.template_id);
    if (!template) {
      throw new Error('Template not found');
    }

    const leads = await this.getLeadsForCampaign(campaignId);

    if (leads.length === 0) {
      throw new Error('No leads match campaign filters');
    }

    let queued = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        const validation = templateService.validateVariablesForLead(template, lead);
        if (!validation.valid) {
          console.warn(
            `Lead ${lead.id} missing variables: ${validation.missingVars.join(', ')}`,
          );
          failed++;
          continue;
        }

        const messageText = templateService.substituteVariables(
          template.content,
          lead,
        );

        const queueResult = await pool.query(
          `INSERT INTO message_queue (lead_id, campaign_id, phone, template_id, message_text, status, metadata)
           VALUES ($1, $2, $3, $4, $5, 'pending', $6)
           RETURNING id`,
          [
            lead.id,
            campaignId,
            lead.phone,
            campaign.template_id,
            messageText,
            JSON.stringify({ campaign_id: campaignId, variables_used: lead }),
          ],
        );

        const messageQueueId = queueResult.rows[0].id;

        await queueService.addMessageToQueue(
          messageQueueId,
          lead.phone,
          campaign.template_id,
          messageText,
          campaignId,
          lead.id,
        );

        queued++;
      } catch (error) {
        console.error(`Failed to queue message for lead ${lead.id}:`, error);
        failed++;
      }
    }

    await this.updateCampaign(campaignId, {
      status: 'active',
    });

    console.log(`Campaign ${campaignId} launched: ${queued} messages queued, ${failed} failed`);

    return { queued, failed };
  }

  async getLeadsForCampaign(campaignId) {
    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (campaign.filters.city) {
      query += ` AND city = $${params.length + 1}`;
      params.push(campaign.filters.city);
    }

    if (campaign.filters.source) {
      query += ` AND source = $${params.length + 1}`;
      params.push(campaign.filters.source);
    }

    if (campaign.filters.is_valid !== undefined) {
      query += ` AND is_valid = $${params.length + 1}`;
      params.push(campaign.filters.is_valid);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getCampaignStats(campaignId) {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'responded' THEN 1 ELSE 0 END) as responded
      FROM message_queue WHERE campaign_id = $1`,
      [campaignId],
    );

    const row = result.rows[0];
    return {
      total: parseInt(row.total) || 0,
      sent: parseInt(row.sent) || 0,
      delivered: parseInt(row.delivered) || 0,
      failed: parseInt(row.failed) || 0,
      responded: parseInt(row.responded) || 0,
    };
  }

  formatCampaign(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      template_id: row.template_id,
      filters: row.filters || {},
      schedule_config: row.schedule_config,
      rate_limit_per_minute: row.rate_limit_per_minute,
      status: row.status,
      stats: row.stats || {},
      created_at: new Date(row.created_at),
      started_at: row.started_at ? new Date(row.started_at) : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      updated_at: new Date(row.updated_at),
    };
  }
}

export { CampaignService };
export const campaignService = new CampaignService();
export default campaignService;
