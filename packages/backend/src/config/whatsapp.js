/**
 * WhatsApp Configuration
 * Module 4 - WhatsApp SDR
 */

export const whatsappConfig = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'test_sid',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'test_token',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+5511999999999',
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'https://example.com/api/whatsapp/webhooks',
  },

  queue: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    },
  },

  rateLimit: {
    messagesPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 5,
    windowMs: 60000, // 1 minute
  },

  webhook: {
    validateSignature: process.env.VALIDATE_WEBHOOK_SIGNATURE !== 'false',
  },

  templates: {
    maxLength: 1000,
  },
};

export function validateWhatsAppConfig() {
  const errors = [];

  if (!whatsappConfig.twilio.accountSid || whatsappConfig.twilio.accountSid === 'test_sid') {
    errors.push('TWILIO_ACCOUNT_SID not configured');
  }

  if (!whatsappConfig.twilio.authToken || whatsappConfig.twilio.authToken === 'test_token') {
    errors.push('TWILIO_AUTH_TOKEN not configured');
  }

  if (!whatsappConfig.twilio.phoneNumber) {
    errors.push('TWILIO_PHONE_NUMBER not configured');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default whatsappConfig;
