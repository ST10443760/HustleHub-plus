const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const SECRET = 'hustlehub-auth-tests-only-secret';
process.env.JWT_SECRET = SECRET;

const User = require('../src/models/User');
const { protect, requireRole } = require('../src/middleware/authMiddleware');

const validId = new mongoose.Types.ObjectId().toString();

let originalFindById;

beforeEach(() => {
  originalFindById = User.findById;
});

afterEach(() => {
  User.findById = originalFindById;
});

function makeToken(payload = { id: validId }, options = {}) {
  return jwt.sign(payload, SECRET, options);
}

async function runProtect(authorization, lookup) {
  if (lookup) User.findById = lookup;

  const req = {
    headers: authorization === undefined ? {} : { authorization },
  };

  let nextCalled = false;
  let nextError;

  await protect(req, {}, (err) => {
    nextCalled = true;
    nextError = err;
  });

  return { req, nextCalled, nextError };
}

function existingClientLookup() {
  return () => ({
    select: async () => ({ id: validId, role: 'client' }),
  });
}

test('rejects a request with no Authorization header', async () => {
  const result = await runProtect(undefined);

  assert.equal(result.nextCalled, true);
  assert.equal(result.nextError.statusCode, 401);
  assert.match(result.nextError.message, /no token provided/i);
});

test('rejects an Authorization header that does not use Bearer', async () => {
  const result = await runProtect('Basic some-token');

  assert.equal(result.nextError.statusCode, 401);
});

test('rejects an invalid JWT', async () => {
  const result = await runProtect('Bearer this-is-not-a-valid-token');

  assert.equal(result.nextError.statusCode, 401);
  assert.match(result.nextError.message, /invalid or expired token/i);
});

test('rejects an expired JWT', async () => {
  const token = makeToken({ id: validId }, { expiresIn: -1 });
  const result = await runProtect(`Bearer ${token}`);

  assert.equal(result.nextError.statusCode, 401);
});

test('rejects a validly signed token containing an invalid user ID', async () => {
  const token = makeToken({ id: 'not-a-valid-object-id' });
  const result = await runProtect(`Bearer ${token}`);

  assert.equal(result.nextError.statusCode, 401);
});

test('rejects a token when its user no longer exists', async () => {
  const result = await runProtect(
    `Bearer ${makeToken()}`,
    () => ({ select: async () => null })
  );

  assert.equal(result.nextError.statusCode, 401);
  assert.match(result.nextError.message, /user no longer exists/i);
});

test('accepts a valid token and attaches the database user to the request', async () => {
  const result = await runProtect(`Bearer ${makeToken()}`, existingClientLookup());

  assert.equal(result.nextCalled, true);
  assert.equal(result.nextError, undefined);
  assert.deepEqual(result.req.user, { id: validId, role: 'client' });
});

test('uses the database role instead of a role claim supplied in the JWT', async () => {
  const token = makeToken({ id: validId, role: 'admin' });
  const result = await runProtect(`Bearer ${token}`, existingClientLookup());

  assert.equal(result.nextError, undefined);
  assert.equal(result.req.user.role, 'client');
});

test('forwards database lookup failures instead of treating them as authentication failures', async () => {
  const databaseError = new Error('Database unavailable');

  const result = await runProtect(
    `Bearer ${makeToken()}`,
    () => ({ select: async () => { throw databaseError; } })
  );

  assert.equal(result.nextCalled, true);
  assert.equal(result.nextError, databaseError);
  assert.notEqual(result.nextError.statusCode, 401);
});

test('rejects a user whose role is not allowed', () => {
  const middleware = requireRole('admin');
  let nextError;

  middleware(
    { user: { id: validId, role: 'client' }, method: 'GET', originalUrl: '/api/admin' },
    {},
    (err) => { nextError = err; }
  );

  assert.equal(nextError.statusCode, 403);
  assert.equal(nextError.message, 'You do not have permission to perform this action');
});

test('rejects a request when no authenticated user is attached', () => {
  const middleware = requireRole('admin');
  let nextError;

  middleware({ method: 'GET', originalUrl: '/api/admin' }, {}, (err) => {
    nextError = err;
  });

  assert.equal(nextError.statusCode, 403);
});

test('allows a user with one of the permitted roles', () => {
  const middleware = requireRole('client', 'freelancer');
  let nextCalled = false;

  middleware(
    { user: { id: validId, role: 'freelancer' } },
    {},
    () => { nextCalled = true; }
  );

  assert.equal(nextCalled, true);
});
