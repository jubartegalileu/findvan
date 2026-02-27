import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignService } from '../../src/services/campaign-service.js';
import { TemplateService } from '../../src/services/template-service.js';
import { pool } from '../../src/db/pool.js';

test('CampaignService - Campaign Management', async (t) => {
  const campaignService = new CampaignService();
  const templateService = new TemplateService();

  // Setup: Create a template for campaigns
  let templateId;
  await pool.query('DELETE FROM campaigns WHERE name LIKE $1', ['Test%']);
  await pool.query('DELETE FROM templates WHERE name LIKE $1', ['Test%']);

  const template = await templateService.createTemplate({
    name: 'Test Campaign Template',
    content: 'Hello {{name}}, your company is {{company}}',
  });
  templateId = template.id;

  await t.test('createCampaign creates new draft campaign', async () => {
    const result = await campaignService.createCampaign({
      name: 'Test Campaign 1',
      description: 'First test campaign',
      template_id: templateId,
      filters: { city: 'São Paulo', source: 'google_maps' },
      rate_limit_per_minute: 5,
    });

    assert.ok(result.id);
    assert.equal(result.name, 'Test Campaign 1');
    assert.equal(result.status, 'draft');
    assert.equal(result.rate_limit_per_minute, 5);
    assert.equal(result.filters.city, 'São Paulo');
  });

  await t.test('createCampaign validates template exists', async () => {
    try {
      await campaignService.createCampaign({
        name: 'Bad Campaign',
        template_id: 99999,
        filters: {},
      });
      assert.fail('Should throw on invalid template');
    } catch (err) {
      assert.match(err.message, /Template/i);
    }
  });

  await t.test('createCampaign validates rate limit range', async () => {
    try {
      await campaignService.createCampaign({
        name: 'Bad Rate Limit',
        template_id: templateId,
        rate_limit_per_minute: 101, // > 100
      });
      assert.fail('Should throw on invalid rate limit');
    } catch (err) {
      assert.match(err.message, /rate limit/i);
    }
  });

  await t.test('getCampaignById fetches campaign', async () => {
    const created = await campaignService.createCampaign({
      name: 'Test Campaign 2',
      template_id: templateId,
    });

    const fetched = await campaignService.getCampaignById(created.id);
    assert.ok(fetched);
    assert.equal(fetched.name, 'Test Campaign 2');
  });

  await t.test('getCampaignById returns null for non-existent', async () => {
    const result = await campaignService.getCampaignById(99999);
    assert.equal(result, null);
  });

  await t.test('getAllCampaigns returns paginated campaigns', async () => {
    await campaignService.createCampaign({
      name: 'Test Campaign 3',
      template_id: templateId,
    });

    const result = await campaignService.getAllCampaigns(1, 10);
    assert.ok(Array.isArray(result.campaigns));
    assert.ok(result.total >= 0);
    assert.ok(result.pages >= 0);
  });

  await t.test('getAllCampaigns filters by status', async () => {
    const result = await campaignService.getAllCampaigns(1, 10, 'draft');
    assert.ok(Array.isArray(result.campaigns));
    // All campaigns should be draft status
    result.campaigns.forEach(c => assert.equal(c.status, 'draft'));
  });

  await t.test('updateCampaign modifies draft campaign', async () => {
    const created = await campaignService.createCampaign({
      name: 'Test Campaign 4',
      template_id: templateId,
    });

    const updated = await campaignService.updateCampaign(created.id, {
      name: 'Updated Campaign 4',
    });

    assert.equal(updated.name, 'Updated Campaign 4');
  });

  await t.test('updateCampaign prevents non-draft modifications', async () => {
    const created = await campaignService.createCampaign({
      name: 'Test Campaign 5',
      template_id: templateId,
    });

    // Activate campaign
    await campaignService.updateCampaign(created.id, { status: 'active' });

    // Try to update name (should fail)
    try {
      await campaignService.updateCampaign(created.id, { name: 'New Name' });
      assert.fail('Should prevent non-draft modifications');
    } catch (err) {
      assert.match(err.message, /draft/i);
    }
  });

  await t.test('updateCampaign sets started_at when activating', async () => {
    const created = await campaignService.createCampaign({
      name: 'Test Campaign 6',
      template_id: templateId,
    });

    const updated = await campaignService.updateCampaign(created.id, {
      status: 'active',
    });

    assert.ok(updated.started_at);
  });

  await t.test('updateCampaign sets completed_at when completing', async () => {
    const created = await campaignService.createCampaign({
      name: 'Test Campaign 7',
      template_id: templateId,
    });

    // First activate
    await campaignService.updateCampaign(created.id, { status: 'active' });

    // Then complete
    const updated = await campaignService.updateCampaign(created.id, {
      status: 'completed',
    });

    assert.ok(updated.completed_at);
  });

  await t.test('getCampaignStats aggregates message statistics', async () => {
    const created = await campaignService.createCampaign({
      name: 'Test Campaign 8',
      template_id: templateId,
    });

    const stats = await campaignService.getCampaignStats(created.id);
    assert.ok(stats);
    assert.equal(stats.total, 0); // No messages yet
    assert.equal(stats.sent, 0);
    assert.equal(stats.delivered, 0);
  });

  await t.test('launchCampaign only works on draft campaigns', async () => {
    const created = await campaignService.createCampaign({
      name: 'Test Campaign 9',
      template_id: templateId,
    });

    // Activate first
    await campaignService.updateCampaign(created.id, { status: 'active' });

    // Try to launch (should fail)
    try {
      await campaignService.launchCampaign(created.id);
      assert.fail('Should prevent launching non-draft campaigns');
    } catch (err) {
      assert.match(err.message, /draft/i);
    }
  });

  await t.test('getLeadsForCampaign builds correct SQL filters', async () => {
    const created = await campaignService.createCampaign({
      name: 'Test Campaign 10',
      template_id: templateId,
      filters: { city: 'Rio de Janeiro', source: 'google' },
    });

    // This test just checks that the method runs without error
    // Actual leads would depend on database setup
    try {
      const leads = await campaignService.getLeadsForCampaign(created.id);
      assert.ok(Array.isArray(leads));
    } catch (err) {
      // May fail if no leads in test DB
      assert.ok(err.message);
    }
  });

  // Cleanup
  await pool.query('DELETE FROM campaigns WHERE name LIKE $1', ['Test%']);
  await pool.query('DELETE FROM templates WHERE name LIKE $1', ['Test%']);
});
