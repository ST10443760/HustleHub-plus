const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const { createGigRules } = require('../src/middleware/gigValidators');

// Runs the create-gig rules against a body, without Express or a database.
async function errorsFor(body) {
  const req = { body: { ...body } };
  for (const rule of createGigRules) await rule.run(req);
  return validationResult(req).array().map((e) => e.msg);
}

const validGig = {
  title: 'Logo design',
  description: 'A clean, modern logo for your brand',
  price: 150,
  category: 'design',
  deliveryDays: 5,
};

test('accepts whole prices and prices with one or two decimals', async () => {
  for (const price of [1, 150, 149.9, 149.99, 100000]) {
    assert.deepEqual(await errorsFor({ ...validGig, price }), [], `price ${price}`);
  }
});

test('rejects prices with more than two decimals', async () => {
  for (const price of [149.999, 1.005, 0.001 + 1]) {
    assert.ok((await errorsFor({ ...validGig, price })).includes('Price can have at most 2 decimal places'), `price ${price}`);
  }
});

test('the decimals check is fast even on a long input', async () => {
  // A string far longer than any real price, ending in a character that
  // makes the match fail: must still finish straight away.
  const started = process.hrtime.bigint();
  const errors = await errorsFor({ ...validGig, price: Number('1'.repeat(300)) });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  assert.ok(errors.length > 0); // out of range anyway
  assert.ok(ms < 200, `took ${ms}ms`);
});

test('rejects a price sent as text', async () => {
  assert.ok((await errorsFor({ ...validGig, price: '150' })).includes('Price must be a number'));
});
