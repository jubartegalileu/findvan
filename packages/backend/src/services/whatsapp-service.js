/**
 * WhatsApp Service - Twilio Integration
 * Module 4 - WhatsApp SDR
 */

import twilio from 'twilio';
import crypto from 'crypto';
import { whatsappConfig } from '../config/whatsapp.js';

class WhatsAppService {
  constructor() {
    try {
      this.client = twilio(
        whatsappConfig.twilio.accountSid,
        whatsappConfig.twilio.authToken,
      );
    } catch (error) {
      console.warn('Twilio client initialization warning (may be expected in tests):', error.message);
    }
  }

  async sendMessage(options) {
    try {
      const { to, message } = options;

      if (!to || !this.isValidPhoneNumber(to)) {
        return {
          success: false,
          error: `Invalid phone number: ${to}`,
        };
      }

      if (!this.client) {
        return {
          success: false,
          error: 'Twilio client not initialized',
        };
      }

      const result = await this.client.messages.create({
        from: `whatsapp:${whatsappConfig.twilio.phoneNumber}`,
        to: `whatsapp:${to}`,
        body: message,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);

      let errorMsg = error.message || 'Unknown error';
      if (error.code === 20003) {
        errorMsg = 'Invalid phone number';
      } else if (error.code === 21211) {
        errorMsg = 'Invalid phone number format';
      } else if (error.code === 21400) {
        errorMsg = 'Invalid parameter';
      } else if (error.code === 20429) {
        errorMsg = 'Rate limit exceeded - try again later';
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  async sendBatchMessages(messages, rateLimit = 5) {
    const results = [];
    const delayMs = (60000 / rateLimit) + 100;

    for (let i = 0; i < messages.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      const result = await this.sendMessage(messages[i]);
      results.push(result);
    }

    return results;
  }

  async getMessageStatus(messageId) {
    try {
      if (!this.client) {
        return { status: 'unknown', error: 'Twilio client not initialized' };
      }

      const message = await this.client.messages(messageId).fetch();
      return {
        status: message.status,
      };
    } catch (error) {
      return {
        status: 'unknown',
        error: error.message,
      };
    }
  }

  verifyWebhookSignature(expectedSignature, body, webhookUrl) {
    if (!whatsappConfig.webhook.validateSignature) {
      return true;
    }

    try {
      // Compute HMAC-SHA1 signature
      const hmac = crypto
        .createHmac('sha1', whatsappConfig.twilio.authToken)
        .update(webhookUrl + body, 'utf8')
        .digest('Base64');

      return hmac === expectedSignature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  isValidPhoneNumber(phone) {
    // E.164 format: + followed by 1-15 digits
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  formatPhoneNumber(phone, countryCode = 'BR') {
    const digits = phone.replace(/\D/g, '');

    if (phone.startsWith('+')) {
      return phone;
    }

    // Map country codes to dialing codes
    const countryMap = {
      'BR': '+55',
      'US': '+1',
      'MX': '+52',
      'AR': '+54',
    };

    const dialingCode = countryMap[countryCode] || countryCode;
    return dialingCode + digits;
  }

  async getAccountInfo() {
    try {
      if (!this.client) {
        return { accountSid: whatsappConfig.twilio.accountSid };
      }

      const account = await this.client.api.accounts.list({ limit: 1 });
      return {
        accountSid: whatsappConfig.twilio.accountSid,
        balance: account[0]?.balance || 'unknown',
      };
    } catch (error) {
      return {
        accountSid: whatsappConfig.twilio.accountSid,
        error: error.message,
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
