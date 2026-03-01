import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignRateLimiter, createCampaignRateLimiter } from '../../src/services/ratelimiter.js';

test('RateLimiter - Token Bucket Algorithm', async (t) => {
  const limiter = createCampaignRateLimiter(10); // 10 msg/min = 1 token per 6 seconds

  await t.test('allows request when tokens available', () => {
    assert.ok(limiter.isAllowed('user1', 1));
    assert.ok(limiter.isAllowed('user1', 1));
    assert.ok(limiter.isAllowed('user1', 1));
  });

  await t.test('denies request when tokens exhausted', () => {
    const limiter2 = createCampaignRateLimiter(3);
    assert.ok(limiter2.isAllowed('user2', 3)); // Use all tokens
    assert.equal(limiter2.isAllowed('user2', 1), false); // Should deny
  });

  await t.test('tracks tokens per user', () => {
    const limiter3 = createCampaignRateLimiter(5);
    assert.ok(limiter3.isAllowed('user3', 2));
    assert.ok(limiter3.isAllowed('user4', 2));
    // user3 has 3 tokens left, user4 has 3 tokens left
    assert.ok(limiter3.isAllowed('user3', 3)); // user3: 3 tokens = OK
    assert.equal(limiter3.isAllowed('user4', 4), false); // user4: only 3 tokens = FAIL
  });

  await t.test('refills tokens after time passes', (t) => {
    return new Promise((resolve) => {
      const limiter4 = createCampaignRateLimiter(2, 100); // 2 tokens per 100ms
      assert.ok(limiter4.isAllowed('user5', 2)); // Use all
      assert.equal(limiter4.isAllowed('user5', 1), false); // Deny

      setTimeout(() => {
        assert.ok(limiter4.isAllowed('user5', 1)); // After refill, allow
        resolve();
      }, 120);
    });
  });

  await t.test('getTokens returns current token count', () => {
    const limiter5 = createCampaignRateLimiter(10);
    const initial = limiter5.getTokens('user6');
    assert.equal(initial, 10);

    limiter5.isAllowed('user6', 3);
    const after = limiter5.getTokens('user6');
    assert.equal(after, 7);
  });

  await t.test('reset clears limiter for key', () => {
    const limiter6 = createCampaignRateLimiter(5);
    limiter6.isAllowed('user7', 5); // Exhaust
    assert.equal(limiter6.isAllowed('user7', 1), false);

    limiter6.reset('user7');
    assert.equal(limiter6.getTokens('user7'), 5); // Reset to capacity
  });

  await t.test('resetAll clears all limiters', () => {
    const limiter7 = createCampaignRateLimiter(3);
    limiter7.isAllowed('user8', 3);
    limiter7.isAllowed('user9', 3);

    limiter7.resetAll();
    assert.equal(limiter7.getTokens('user8'), 3);
    assert.equal(limiter7.getTokens('user9'), 3);
  });

  await t.test('getStats returns all tracked keys', () => {
    const limiter8 = createCampaignRateLimiter(5);
    limiter8.isAllowed('user10', 2);
    limiter8.isAllowed('user11', 1);

    const stats = limiter8.getStats();
    assert.ok(stats.user10);
    assert.ok(stats.user11);
    assert.equal(stats.user10.capacity, 5);
  });

  await t.test('capacity limits maximum tokens', () => {
    const limiter9 = createCampaignRateLimiter(5);
    // Even with time passing, tokens should not exceed capacity
    const tokens = limiter9.getTokens('user12');
    assert.equal(tokens <= 5, true);
  });
});
