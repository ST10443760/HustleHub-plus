const { test } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');

// toJSON is what every API response uses. No database needed.
test('toJSON never includes the hash, lockout or session fields', () => {
  const user = new User({
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuuJ0123456789012345678901234567',
    role: 'client',
    failedLoginAttempts: 3,
    firstFailedLoginAt: new Date(),
    lastFailedLoginAt: new Date(),
    lockUntil: new Date(),
    tokenVersion: 7,
  });
  const json = user.toJSON();
  for (const field of ['passwordHash', 'failedLoginAttempts', 'firstFailedLoginAt', 'lastFailedLoginAt', 'lockUntil', 'tokenVersion', '_id', '__v']) {
    assert.equal(field in json, false, `${field} must not be in the response`);
  }
  assert.equal(json.id, user._id.toString());
  assert.equal(json.name, 'Test User');
  assert.equal(json.role, 'client');
});

test('new accounts start with no failures and token version 0', () => {
  const user = new User({ name: 'New', email: 'new@example.com', passwordHash: 'x' });
  assert.equal(user.failedLoginAttempts, 0);
  assert.equal(user.lockUntil, null);
  assert.equal(user.tokenVersion, 0);
});
