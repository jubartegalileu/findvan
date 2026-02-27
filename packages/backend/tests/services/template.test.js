import test from 'node:test';
import assert from 'node:assert/strict';
import { TemplateService } from '../../src/services/template-service.js';
import { pool } from '../../src/db/pool.js';

test('TemplateService - CRUD Operations', async (t) => {
  const service = new TemplateService();

  // Clean up before tests
  await pool.query('DELETE FROM templates WHERE name LIKE $1', ['Test%']);

  await t.test('createTemplate creates new template with variables', async () => {
    const result = await service.createTemplate({
      name: 'Test Template 1',
      content: 'Hello {{name}}, your company is {{company}}',
      variables: ['name', 'company'],
    });

    assert.ok(result.id);
    assert.equal(result.name, 'Test Template 1');
    assert.ok(result.variables.includes('name'));
    assert.ok(result.variables.includes('company'));
  });

  await t.test('createTemplate validates required fields', async () => {
    try {
      await service.createTemplate({
        name: '',
        content: 'Test',
      });
      assert.fail('Should throw on empty name');
    } catch (err) {
      assert.match(err.message, /name is required/i);
    }
  });

  await t.test('createTemplate enforces max length', async () => {
    try {
      const longContent = 'a'.repeat(1001);
      await service.createTemplate({
        name: 'Test',
        content: longContent,
      });
      assert.fail('Should throw on content too long');
    } catch (err) {
      assert.match(err.message, /exceeds max length/i);
    }
  });

  await t.test('createTemplate extracts variables from content', async () => {
    const result = await service.createTemplate({
      name: 'Test Template 2',
      content: 'Hi {{name}}, {{city}} is great. {{name}} again.',
    });

    assert.ok(result.variables.includes('name'));
    assert.ok(result.variables.includes('city'));
    assert.equal(result.variables.length, 2); // name and city (no duplicates)
  });

  await t.test('getTemplateById fetches template', async () => {
    const created = await service.createTemplate({
      name: 'Test Template 3',
      content: 'Test {{content}}',
    });

    const fetched = await service.getTemplateById(created.id);
    assert.ok(fetched);
    assert.equal(fetched.name, 'Test Template 3');
  });

  await t.test('getTemplateById returns null for non-existent', async () => {
    const result = await service.getTemplateById(99999);
    assert.equal(result, null);
  });

  await t.test('getAllTemplates returns active templates', async () => {
    await service.createTemplate({
      name: 'Test Template 4',
      content: 'Active template',
    });

    const templates = await service.getAllTemplates(true);
    const testTemplate = templates.find(t => t.name === 'Test Template 4');
    assert.ok(testTemplate);
  });

  await t.test('updateTemplate modifies template', async () => {
    const created = await service.createTemplate({
      name: 'Test Template 5',
      content: 'Original',
    });

    const updated = await service.updateTemplate(created.id, {
      content: 'Updated {{var}}',
    });

    assert.equal(updated.content, 'Updated {{var}}');
    assert.ok(updated.variables.includes('var'));
  });

  await t.test('deleteTemplate soft deletes', async () => {
    const created = await service.createTemplate({
      name: 'Test Template 6',
      content: 'Will be deleted',
    });

    await service.deleteTemplate(created.id);

    const fetched = await service.getTemplateById(created.id);
    // After soft delete, getTemplateById should return null if filtering by is_active
    assert.equal(fetched, null);
  });

  await t.test('substituteVariables replaces placeholders', () => {
    const content = 'Hi {{name}}, welcome to {{city}}!';
    const result = service.substituteVariables(content, {
      name: 'João',
      city: 'São Paulo',
    });

    assert.equal(result, 'Hi João, welcome to São Paulo!');
  });

  await t.test('substituteVariables handles missing variables', () => {
    const content = 'Hi {{name}}, company: {{company}}';
    const result = service.substituteVariables(content, {
      name: 'Maria',
      // company is missing
    });

    assert.ok(result.includes('Hi Maria'));
    assert.ok(result.includes('{{company}}')); // Should remain if missing
  });

  await t.test('validateVariablesForLead checks required variables', () => {
    const template = {
      id: 1,
      name: 'Test',
      content: '{{name}} {{company}}',
      variables: ['name', 'company'],
      is_default: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const leadWithAll = { name: 'João', company: 'ACME' };
    const leadMissing = { name: 'João' };

    const validFull = service.validateVariablesForLead(template, leadWithAll);
    assert.equal(validFull.valid, true);
    assert.equal(validFull.missingVars.length, 0);

    const validPartial = service.validateVariablesForLead(template, leadMissing);
    assert.equal(validPartial.valid, false);
    assert.ok(validPartial.missingVars.includes('company'));
  });

  // Clean up
  await pool.query('DELETE FROM templates WHERE name LIKE $1', ['Test%']);
});
