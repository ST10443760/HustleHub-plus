const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { requestId, restoreContext, accessLog } = require('../src/middleware/requestLogging');
const logger = require('../src/utils/logger');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Collects the JSON records the logger prints.
const records = [];
const original = { log: console.log, warn: console.warn, error: console.error, format: process.env.LOG_FORMAT };

let server;
let base;

before(async () => {
  process.env.LOG_FORMAT = 'json';
  console.log = console.warn = console.error = (line) => {
    try {
      records.push(JSON.parse(line));
    } catch {
      // not a log record
    }
  };

  // The same order as app.js: request id, access log, body parsing, then
  // the context is restored.
  const app = express();
  app.use(requestId);
  app.use(accessLog);
  app.get('/api/health', (req, res) => res.json({ success: true }));
  app.use(express.json());
  app.use(restoreContext);
  app.post('/api/things', async (req, res) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    logger.event('GIG_CREATED', 'Thing created', { size: Object.keys(req.body).length });
    res.status(201).json({ success: true, data: { ok: true } });
  });
  app.get('/api/broken', (req, res) => res.status(500).json({ success: false, error: 'x' }));
  app.get('/api/missing', (req, res) => res.status(404).json({ success: false, error: 'Not found' }));

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  Object.assign(console, { log: original.log, warn: original.warn, error: original.error });
  if (original.format === undefined) delete process.env.LOG_FORMAT;
  else process.env.LOG_FORMAT = original.format;
  await new Promise((resolve) => server.close(resolve));
});

// Waits for the access line of the request with this id.
async function accessLine(id) {
  for (let i = 0; i < 50; i += 1) {
    const line = records.find((r) => r.event === 'HTTP_REQUEST' && r.requestId === id);
    if (line) return line;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return undefined;
}

test('every response gets a fresh server-generated X-Request-Id', async () => {
  const a = await fetch(`${base}/api/missing`);
  const b = await fetch(`${base}/api/missing`);
  assert.match(a.headers.get('x-request-id'), UUID);
  assert.notEqual(a.headers.get('x-request-id'), b.headers.get('x-request-id'));
});

test('a client-supplied X-Request-Id is ignored', async () => {
  const res = await fetch(`${base}/api/missing`, { headers: { 'X-Request-Id': 'forged-id' } });
  assert.notEqual(res.headers.get('x-request-id'), 'forged-id');
  assert.match(res.headers.get('x-request-id'), UUID);
  assert.ok(!records.some((r) => r.requestId === 'forged-id'));
});

test('the response body is not changed', async () => {
  const res = await fetch(`${base}/api/things`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' });
  assert.deepEqual(await res.json(), { success: true, data: { ok: true } });
});

test('logs inside a handler (after body parsing and an await) carry the request id', async () => {
  const res = await fetch(`${base}/api/things`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1,"b":2}' });
  const id = res.headers.get('x-request-id');
  const event = records.find((r) => r.event === 'GIG_CREATED' && r.requestId === id);
  assert.ok(event, 'the event has the request id');
  assert.equal(event.method, 'POST');
  assert.equal(event.path, '/api/things');
  assert.equal(event.size, 2);
});

test('one access line per request: method, path without the query string, status, duration', async () => {
  const res = await fetch(`${base}/api/missing?email=jane@example.com&token=abc`, { headers: { Authorization: 'Bearer abc', Cookie: 'sid=1' } });
  const id = res.headers.get('x-request-id');
  const line = await accessLine(id);
  assert.ok(line);
  assert.equal(line.method, 'GET');
  assert.equal(line.path, '/api/missing');
  assert.equal(line.status, 404);
  assert.equal(line.level, 'warn');
  assert.equal(typeof line.durationMs, 'number');
  assert.equal(records.filter((r) => r.event === 'HTTP_REQUEST' && r.requestId === id).length, 1);
  const text = JSON.stringify(records.filter((r) => r.requestId === id));
  assert.ok(!text.includes('jane') && !text.includes('token=') && !text.includes('Bearer') && !text.includes('sid='));
});

test('5xx is logged as an error, 2xx as info', async () => {
  const broken = await accessLine((await fetch(`${base}/api/broken`)).headers.get('x-request-id'));
  assert.equal(broken.level, 'error');
  const ok = await fetch(`${base}/api/things`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal((await accessLine(ok.headers.get('x-request-id'))).level, 'info');
});

test('the health check and CORS preflights are not access-logged', async () => {
  const health = await fetch(`${base}/api/health`);
  const preflight = await fetch(`${base}/api/things`, { method: 'OPTIONS' });
  await new Promise((resolve) => setTimeout(resolve, 50));
  for (const res of [health, preflight]) {
    const id = res.headers.get('x-request-id');
    assert.ok(!records.some((r) => r.event === 'HTTP_REQUEST' && r.requestId === id));
  }
});
