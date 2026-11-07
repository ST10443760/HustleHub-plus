const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateEnv } = require('../src/config/env');

const SECRET = 'a'.repeat(64);
const URI = 'mongodb://mongo:27017/hustlehub?replicaSet=rs0';

test('passes when everything required is set', () => {
  assert.deepEqual(validateEnv({ JWT_SECRET: SECRET, MONGO_URI: URI }), []);
  assert.deepEqual(validateEnv({ JWT_SECRET: SECRET, MONGO_URI: URI, NODE_ENV: 'production' }), []);
});

test('fails when JWT_SECRET is missing or blank', () => {
  for (const value of [undefined, '', '   ']) {
    const problems = validateEnv({ JWT_SECRET: value, MONGO_URI: URI });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /JWT_SECRET is not set/);
  }
});

test('needs a long JWT_SECRET in production only', () => {
  assert.deepEqual(validateEnv({ JWT_SECRET: 'short', MONGO_URI: URI }), []);
  const problems = validateEnv({ JWT_SECRET: 'short', MONGO_URI: URI, NODE_ENV: 'production' });
  assert.match(problems[0], /at least 32 characters/);
});

test('fails when MONGO_URI is missing', () => {
  assert.match(validateEnv({ JWT_SECRET: SECRET })[0], /MONGO_URI is not set/);
});

test('never puts a secret value in a message', () => {
  const problems = validateEnv({ JWT_SECRET: 'tiny-secret', NODE_ENV: 'production' });
  assert.ok(problems.every((p) => !p.includes('tiny-secret')));
});
