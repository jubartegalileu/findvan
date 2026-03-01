/**
 * Queue Service - Message Queue Management
 * Using Bull/BullMQ for job processing
 * Module 4 - WhatsApp SDR
 */

import { Queue } from 'bullmq';
import { whatsappService } from './whatsapp-service.js';
import { whatsappConfig } from '../config/whatsapp.js';
import { pool } from '../db/pool.js';

class QueueService {
  constructor() {
    this.messageQueue = new Queue('messages', {
      defaultJobOptions: whatsappConfig?.queue?.defaultJobOptions || {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      connection: this.getQueueConnection(),
    });

    console.log('Message queue initialized');
  }

  getQueueConnection() {
    if (process.env.REDIS_HOST || process.env.REDIS_PORT) {
      return {
        host: whatsappConfig?.queue?.redis?.host || 'localhost',
        port: whatsappConfig?.queue?.redis?.port || 6379,
        password: whatsappConfig?.queue?.redis?.password,
      };
    }

    console.warn('⚠️  Using in-memory queue. For production, configure Redis.');
    return undefined;
  }

  async startProcessor() {
    try {
      this.worker = this.messageQueue.worker || {};
      console.log('✅ Queue processor started');
    } catch (error) {
      console.error('Failed to start queue processor:', error);
      throw error;
    }
  }

  async stopProcessor() {
    try {
      if (this.worker) {
        await this.worker.close?.();
      }
      console.log('✅ Queue processor stopped');
    } catch (error) {
      console.error('Error stopping queue processor:', error);
    }
  }

  async processMessageJob(job) {
    const { messageQueueId, phone, messageText } = job.data;

    try {
      const result = await whatsappService.sendMessage({
        to: phone,
        message: messageText,
        campaignId: job.data.campaignId,
        leadId: job.data.leadId,
      });

      if (result.success && result.messageId) {
        await pool.query(
          `UPDATE message_queue
           SET status = 'sent', twilio_message_id = $1, sent_at = NOW(), attempt_count = attempt_count + 1
           WHERE id = $2`,
          [result.messageId, messageQueueId],
        );

        return { success: true };
      } else {
        await pool.query(
          `UPDATE message_queue
           SET status = 'failed', failed_reason = $1, attempt_count = attempt_count + 1
           WHERE id = $2`,
          [result.error || 'Unknown error', messageQueueId],
        );

        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error(`Error processing message job ${messageQueueId}:`, error);

      await pool.query(
        `UPDATE message_queue
         SET failed_reason = $1, attempt_count = attempt_count + 1
         WHERE id = $2`,
        [error.message || 'Unknown error', messageQueueId],
      );

      throw error;
    }
  }

  async addMessageToQueue(messageQueueId, phone, templateId, messageText, campaignId, leadId, delayMs) {
    try {
      const job = await this.messageQueue.add(
        {
          leadId,
          campaignId,
          phone,
          templateId,
          messageText,
          messageQueueId,
        },
        {
          delay: delayMs,
        },
      );

      console.log(`📨 Message added to queue: ${job.id}`);
    } catch (error) {
      console.error('Error adding message to queue:', error);
      throw error;
    }
  }

  async getQueueStats() {
    try {
      const counts = await this.messageQueue.getJobCounts?.() || {};
      return {
        active: counts.active || 0,
        waiting: counts.wait || 0,
        delayed: counts.delayed || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        active: 0,
        waiting: 0,
        delayed: 0,
        completed: 0,
        failed: 0,
      };
    }
  }

  async clearQueue() {
    try {
      await this.messageQueue.clean?.(0, 1000, 'completed');
      await this.messageQueue.clean?.(0, 1000, 'failed');
      console.log('✅ Queue cleared');
    } catch (error) {
      console.error('Error clearing queue:', error);
      throw error;
    }
  }

  async retryFailedMessages(limit = 10) {
    try {
      const failedJobs = await this.messageQueue.getFailed?.(0, limit) || [];
      let retried = 0;

      for (const job of failedJobs) {
        if (job.attemptsStarted < 3) {
          await job.retry?.();
          retried++;
        }
      }

      console.log(`🔄 Retried ${retried} failed jobs`);
      return retried;
    } catch (error) {
      console.error('Error retrying failed messages:', error);
      return 0;
    }
  }

  getQueue() {
    return this.messageQueue;
  }
}

export { QueueService };
export const queueService = new QueueService();
export default queueService;
