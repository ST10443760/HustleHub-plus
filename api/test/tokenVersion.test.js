const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const generateToken = require('../src/utils/generateToken');

const { tokenVersionOf } = generateToken;

test('a token carries id, role and the token version, nothing else', () => {
  process.env.JWT_SECRET = 'unit-test-secret-not-used-anywhere-else';
  const user = { _id: new mongoose.Types.ObjectId(), role: 'freelancer', tokenVersion: 3, passwordHash: 'x', email: 'a@example.com' };
  const payload = jwt.verify(generateToken(user), process.env.JWT_SECRET);
  assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'id', 'role', 'tv']);
  assert.equal(payload.tv, 3);
  assert.equal(payload.id, user._id.toString());
});

test('accounts without a tokenVersion get tv 0', () => {
  process.env.JWT_SECRET = 'unit-test-secret-not-used-anywhere-else';
  const payload = jwt.verify(generateToken({ _id: new mongoose.Types.ObjectId(), role: 'client' }), process.env.JWT_SECRET);
  assert.equal(payload.tv, 0);
});

test('old tokens without tv count as version 0, so they still match a fresh account', () => {
  assert.equal(tokenVersionOf({ id: 'x', role: 'client' }), 0); // token issued before versions
  assert.equal(tokenVersionOf({ role: 'client' }), 0); // account without the field
  assert.equal(tokenVersionOf({ tv: 0 }), tokenVersionOf({ tokenVersion: undefined }));
});

test('a bumped version no longer matches the old token', () => {
  assert.notEqual(tokenVersionOf({ tv: 0 }), tokenVersionOf({ tokenVersion: 1 }));
  assert.equal(tokenVersionOf({ tv: 4 }), tokenVersionOf({ tokenVersion: 4 }));
});

test('invalid versions count as 0', () => {
  for (const tv of ['1', 1.5, -1, null, {}, NaN]) {
    assert.equal(tokenVersionOf({ tv }), 0, `tv ${String(tv)}`);
  }
});
