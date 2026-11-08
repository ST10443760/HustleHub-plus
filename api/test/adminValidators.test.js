const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const { auditLogQueryRules } = require('../src/middleware/adminValidators');
const { AUDIT_ACTIONS } = require('../src/models/AuditLog');

async function run(query) {
  const req = { query: { ...query } };
  for (const rule of auditLogQueryRules) await rule.run(req);
  return { errors: validationResult(req).array().map((e) => e.msg), query: req.query };
}

test('accepts no parameters, paging and every known action', async () => {
  assert.deepEqual((await run({})).errors, []);
  const { errors, query } = await run({ page: '2', limit: '50' });
  assert.deepEqual(errors, []);
  assert.deepEqual(query, { page: 2, limit: 50 });
  for (const action of AUDIT_ACTIONS) assert.deepEqual((await run({ action })).errors, [], action);
});

test('rejects an unknown action', async () => {
  assert.match((await run({ action: 'drop_database' })).errors.join(), /action must be one of/);
});

test('rejects repeated or out-of-range paging values', async () => {
  assert.match((await run({ page: ['1', '2'] })).errors.join(), /page must be a single value/);
  assert.match((await run({ limit: '51' })).errors.join(), /limit must be a whole number from 1 to 50/);
  assert.match((await run({ action: ['logout_all', 'account_locked'] })).errors.join(), /action must be a single value/);
});

test('rejects unknown query parameters', async () => {
  assert.deepEqual((await run({ actorId: 'x' })).errors, ['Request contains query parameters that are not allowed']);
});
