/**
 * Rate Limiter Service - Token Bucket Algorithm
 * Module 4 - WhatsApp SDR
 */

class RateLimiter {
  constructor(messagesPerMinute = 5, windowMs = 60000) {
    this.buckets = new Map();
    this.capacity = messagesPerMinute;
    this.refillRate = messagesPerMinute / windowMs;
  }

  isAllowed(key, tokensNeeded = 1) {
    let bucket = this.buckets.get(key);
    const now = Date.now();

    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    }

    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= tokensNeeded) {
      bucket.tokens -= tokensNeeded;
      return true;
    }

    return false;
  }

  getTokens(key) {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      return this.capacity;
    }

    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    const currentTokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);

    return currentTokens;
  }

  reset(key) {
    this.buckets.delete(key);
  }

  resetAll() {
    this.buckets.clear();
  }

  getStats() {
    const stats = {};

    this.buckets.forEach((bucket, key) => {
      const now = Date.now();
      const timePassed = now - bucket.lastRefill;
      const tokensToAdd = timePassed * this.refillRate;
      const currentTokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);

      stats[key] = {
        tokens: Math.round(currentTokens * 100) / 100,
        capacity: this.capacity,
      };
    });

    return stats;
  }
}

export const campaignRateLimiter = new RateLimiter();

export function createCampaignRateLimiter(messagesPerMinute = 5, windowMs = 60000) {
  return new RateLimiter(messagesPerMinute, windowMs);
}

export default campaignRateLimiter;
