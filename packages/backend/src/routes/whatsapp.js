/**
 * WhatsApp Routes - Campaign, Template, Message Management
 * Module 4 - WhatsApp SDR
 */

import express from 'express';
import { campaignService } from '../services/campaign-service.js';
import { templateService } from '../services/template-service.js';
import { queueService } from '../services/queue-service.js';
import { whatsappService } from '../services/whatsapp-service.js';
import { whatsappConfig } from '../config/whatsapp.js';
import { pool } from '../db/pool.js';

const router = express.Router();

// ==================== TEMPLATES ====================

router.get('/templates', async (req, res) => {
  try {
    const templates = await templateService.getAllTemplates(true);
    res.json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, content, variables } = req.body;
    const template = await templateService.createTemplate({
      name,
      content,
      variables,
    });
    res.status(201).json({ success: true, template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const template = await templateService.getTemplateById(parseInt(req.params.id));
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await templateService.updateTemplate(parseInt(req.params.id), req.body);
    res.json({ success: true, template });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    await templateService.deleteTemplate(parseInt(req.params.id));
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== CAMPAIGNS ====================

router.get('/campaigns', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const status = req.query.status;

    const result = await campaignService.getAllCampaigns(page, limit, status);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const campaign = await campaignService.createCampaign(req.body);
    res.status(201).json({ success: true, campaign });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await campaignService.getCampaignById(parseInt(req.params.id));
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await campaignService.updateCampaign(parseInt(req.params.id), req.body);
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/campaigns/:id/launch', async (req, res) => {
  try {
    const result = await campaignService.launchCampaign(parseInt(req.params.id));
    const campaign = await campaignService.getCampaignById(parseInt(req.params.id));
    res.json({
      success: true,
      message: `Campaign launched: ${result.queued} messages queued`,
      queued: result.queued,
      failed: result.failed,
      campaign,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== MESSAGES ====================

router.get('/messages', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const leadId = req.query.lead_id;
    const campaignId = req.query.campaign_id;

    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM message_queue WHERE 1=1';
    const params = [];

    if (leadId) {
      query += ` AND lead_id = $${params.length + 1}`;
      params.push(parseInt(leadId));
    }

    if (campaignId) {
      query += ` AND campaign_id = $${params.length + 1}`;
      params.push(parseInt(campaignId));
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM message_queue WHERE 1=1${
        leadId ? ` AND lead_id = ${parseInt(leadId)}` : ''
      }${campaignId ? ` AND campaign_id = ${parseInt(campaignId)}` : ''}`,
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `${query} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${
        params.length + 2
      }`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      messages: result.rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/messages/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM message_queue WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({ success: true, message: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== WEBHOOKS ====================

router.post('/webhooks', async (req, res) => {
  try {
    const signature = req.headers['x-twilio-signature'];
    const body = req.body;

    if (whatsappConfig.webhook.validateSignature) {
      const isValid = whatsappService.verifyWebhookSignature(
        signature,
        JSON.stringify(body),
        whatsappConfig.twilio.webhookUrl,
      );

      if (!isValid) {
        console.warn('Invalid Twilio webhook signature');
        return res.status(403).json({ success: false, error: 'Invalid signature' });
      }
    }

    const messageId = body.MessageSid;
    const status = body.MessageStatus;
    const errorCode = body.ErrorCode;
    const errorMessage = body.ErrorMessage;

    if (messageId) {
      const statusMap = {
        sent: 'sent',
        delivered: 'delivered',
        undelivered: 'failed',
        failed: 'failed',
        received: 'responded',
      };

      const newStatus = statusMap[status] || status;

      await pool.query(
        `UPDATE message_queue
         SET status = $1, ${status === 'delivered' ? 'delivered_at = NOW()' : ''}
         WHERE twilio_message_id = $2`,
        [newStatus, messageId],
      );

      await pool.query(
        `INSERT INTO message_webhook_logs (twilio_message_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [
          messageId,
          status,
          JSON.stringify({
            status,
            errorCode,
            errorMessage,
            timestamp: new Date().toISOString(),
          }),
        ],
      );

      console.log(`✅ Webhook processed: Message ${messageId} - ${status}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== QUEUE STATUS ====================

router.get('/queue/stats', async (req, res) => {
  try {
    const stats = await queueService.getQueueStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/queue/retry/:messageId', async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const result = await pool.query(
      'SELECT * FROM message_queue WHERE id = $1',
      [messageId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const message = result.rows[0];

    await queueService.addMessageToQueue(
      BigInt(messageId),
      message.phone,
      message.template_id,
      message.message_text,
      message.campaign_id,
      message.lead_id,
    );

    res.json({ success: true, message: 'Message re-queued for retry' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
