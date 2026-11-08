const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

const {
  AppError,
  notFoundHandler,
  errorHandler,
} = require('../src/middleware/errorHandler');

const app = express();

// Use a small limit so oversized-body behaviour can be tested safely.
app.use(express.json({ limit: '100b' }));

app.get('/operational', (req, res, next) => {
  next(new AppError('Access denied', 403));
});

app.get('/unexpected', (req, res, next) => {
  next(new Error('Database password leaked internally'));
});

app.get('/mongoose', (req, res, next) => {
  const err = new Error('Internal schema field: passwordHash');
  err.name = 'ValidationError';
  next(err);
});

app.use(notFoundHandler);
app.use(errorHandler);

let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
  });
});

test('operational errors return their safe message and status', async () => {
  const res = await fetch(`${baseUrl}/operational`);
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.deepEqual(body, {
    success: false,
    error: 'Access denied',
  });
});

test('unexpected errors return a generic message', async () => {
  const res = await fetch(`${baseUrl}/unexpected`);
  const body = await res.json();

  assert.equal(res.status, 500);
  assert.deepEqual(body, {
    success: false,
    error: 'Something went wrong. Please try again later.',
  });

  assert.doesNotMatch(JSON.stringify(body), /password|Database/);
  assert.doesNotMatch(JSON.stringify(body), /stack|Error/);
});

test('Mongoose validation errors are converted into safe 400 responses', async () => {
  const res = await fetch(`${baseUrl}/mongoose`);
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.deepEqual(body, {
    success: false,
    error: 'Invalid input',
  });

  assert.doesNotMatch(JSON.stringify(body), /passwordHash/);
});

test('invalid JSON returns a safe 400 response', async () => {
  const res = await fetch(`${baseUrl}/missing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"password":"secret", invalid json}',
  });

  const body = await res.json();

  assert.equal(res.status, 400);
  assert.deepEqual(body, {
    success: false,
    error: 'Request body is not valid JSON',
  });

  assert.doesNotMatch(JSON.stringify(body), /secret|stack/);
});

test('oversized JSON bodies return a safe 413 response', async () => {
  const res = await fetch(`${baseUrl}/missing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: 'x'.repeat(200) }),
  });

  const body = await res.json();

  assert.equal(res.status, 413);
  assert.deepEqual(body, {
    success: false,
    error: 'Request body is too large',
  });
});

test('unknown routes return 404 without exposing query parameters', async () => {
  const res = await fetch(
    `${baseUrl}/not-a-real-route?token=secret123`
  );

  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error, 'Route not found: GET /not-a-real-route');

  assert.doesNotMatch(JSON.stringify(body), /secret123|token=/);
});

test('error handler delegates when response headers have already been sent', () => {
  const originalError = new Error('Already started');

  const req = {};
  const res = { headersSent: true };

  let delegatedError;

  errorHandler(originalError, req, res, (err) => {
    delegatedError = err;
  });

  assert.equal(delegatedError, originalError);
});
