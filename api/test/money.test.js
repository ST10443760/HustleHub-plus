const { test } = require('node:test');
const assert = require('node:assert/strict');
const { roundMoney } = require('../src/utils/money');

test('roundMoney rounds to 2 decimals', () => {
  assert.equal(roundMoney(10), 10);
  assert.equal(roundMoney(10.005), 10.01);
  assert.equal(roundMoney(1.234), 1.23);
});

test('roundMoney removes floating point noise', () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(1.005), 1.01);
});
