const { test } = require('node:test');
const assert = require('node:assert/strict');
const { STRICT_LIMITS, resolveRateLimits } = require('../src/config/rateLimits');

test('uses the strict limits when no overrides are set', () => {
  const { limits, ignoredOverrides } = resolveRateLimits({});
  assert.equal(limits.login.max, STRICT_LIMITS.login.max);
  assert.equal(limits.booking.max, STRICT_LIMITS.booking.max);
  assert.deepEqual(ignoredOverrides, []);
});

test('applies an override outside production', () => {
  const { limits } = resolveRateLimits({ NODE_ENV: 'development', RATE_LIMIT_LOGIN_MAX: '500' });
  assert.equal(limits.login.max, 500);
});

test('ignores overrides in production', () => {
  const { limits, ignoredOverrides } = resolveRateLimits({ NODE_ENV: 'production', RATE_LIMIT_LOGIN_MAX: '500' });
  assert.equal(limits.login.max, STRICT_LIMITS.login.max);
  assert.deepEqual(ignoredOverrides, ['RATE_LIMIT_LOGIN_MAX']);
});

test('ignores overrides that are not positive whole numbers', () => {
  const { limits } = resolveRateLimits({ RATE_LIMIT_GENERAL_MAX: 'abc', RATE_LIMIT_LOGIN_MAX: '-3' });
  assert.equal(limits.general.max, STRICT_LIMITS.general.max);
  assert.equal(limits.login.max, STRICT_LIMITS.login.max);
});
