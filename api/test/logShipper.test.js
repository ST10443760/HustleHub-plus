const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

// These tests must never reach the real logging service, whatever is set
// in the shell or a .env file: clear the real settings before anything
// loads, and only ever point the shipper at the local mock below.
delete process.env.LOG_SHIPPING_URL;
delete process.env.LOG_SHIPPING_TOKEN;
delete process.env.LOG_SHIPPING_IN_TEST;

const { createShipper, resolveShippingConfig } = require('../src/utils/logShipper');
const logger = require('../src/utils/logger');

const TOKEN = `test-${crypto.randomBytes(12).toString('hex')}`; // not a real token
const noSleep = () => Promise.resolve();

// A local stand-in for the ingest API. `statuses` is the scripted list of
// answers (then 200); every request is recorded.
const mock = { requests: [], statuses: [], hang: false };
let server;
let url;

before(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (mock.hang) return; // never answers
      let body = null;
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
      mock.requests.push({ method: req.method, path: req.url, headers: req.headers, body });
      const status = mock.statuses.length > 0 ? mock.statuses.shift() : 200;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(status === 200 ? JSON.stringify({ ingested: Array.isArray(body) ? body.length : 0, failed: 0, failures: [] }) : '{"message":"no"}');
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}/v1/ingest/test-dataset`;
});

after(() => {
  server.closeAllConnections();
  return new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  mock.requests = [];
  mock.statuses = [];
  mock.hang = false;
});

const record = (n, extra = {}) => ({ timestamp: new Date().toISOString(), level: 'info', event: 'APP_LOG', message: `m${n}`, n, ...extra });

function shipper(options = {}) {
  return createShipper({ url, token: TOKEN, sleep: noSleep, flushAt: 1000, ...options });
}

describe('configuration', () => {
  test('disabled when not configured', () => {
    assert.equal(resolveShippingConfig({}).enabled, false);
    assert.equal(resolveShippingConfig({ LOG_SHIPPING_URL: 'https://example.com/v1/ingest/x' }).enabled, false);
    assert.equal(resolveShippingConfig({ LOG_SHIPPING_TOKEN: TOKEN }).enabled, false);
    assert.equal(resolveShippingConfig({ LOG_SHIPPING_URL: '  ', LOG_SHIPPING_TOKEN: TOKEN }).enabled, false);
  });

  test('enabled with an https URL and a token', () => {
    const config = resolveShippingConfig({ LOG_SHIPPING_URL: 'https://example.com/v1/ingest/x', LOG_SHIPPING_TOKEN: TOKEN });
    assert.equal(config.enabled, true);
  });

  test('off in test runs unless LOG_SHIPPING_IN_TEST=1', () => {
    const base = { LOG_SHIPPING_URL: 'https://example.com/v1/ingest/x', LOG_SHIPPING_TOKEN: TOKEN };
    assert.equal(resolveShippingConfig({ ...base, NODE_ENV: 'test' }).enabled, false);
    assert.equal(resolveShippingConfig({ ...base, HUSTLEHUB_TEST_RUN: '1' }).enabled, false); // npm run start:test
    assert.equal(resolveShippingConfig({ ...base, NODE_TEST_CONTEXT: 'child' }).enabled, false); // node --test
    assert.equal(resolveShippingConfig({ ...base, NODE_ENV: 'test', LOG_SHIPPING_IN_TEST: '1' }).enabled, true);
  });

  test('https is required; plain http only to loopback in a test run', () => {
    const env = (u, extra = {}) => ({ LOG_SHIPPING_URL: u, LOG_SHIPPING_TOKEN: TOKEN, ...extra });
    assert.equal(resolveShippingConfig(env('http://logs.example.com/v1/ingest/x')).enabled, false);
    assert.equal(resolveShippingConfig(env('http://127.0.0.1:9/v1/ingest/x')).enabled, false);
    assert.equal(resolveShippingConfig(env('http://127.0.0.1:9/x', { NODE_ENV: 'test', LOG_SHIPPING_IN_TEST: '1' })).enabled, true);
    assert.equal(resolveShippingConfig(env('http://logs.example.com/x', { NODE_ENV: 'test', LOG_SHIPPING_IN_TEST: '1' })).enabled, false);
    assert.equal(resolveShippingConfig(env('not a url')).enabled, false);
    assert.equal(resolveShippingConfig(env('https://user:pw@example.com/x')).enabled, false);
  });

  test('the reason never contains the URL or the token', () => {
    const secretUrl = 'http://hidden-host.example/v1/ingest/hidden-dataset';
    for (const env of [{ LOG_SHIPPING_URL: secretUrl, LOG_SHIPPING_TOKEN: TOKEN }, { LOG_SHIPPING_URL: secretUrl }, { LOG_SHIPPING_TOKEN: TOKEN }]) {
      const { reason } = resolveShippingConfig(env);
      assert.ok(!reason.includes('hidden') && !reason.includes(TOKEN), reason);
    }
  });
});

describe('sending', () => {
  test('batches records, at most maxBatch per request, in Axiom shape', async () => {
    const s = shipper({ maxBatch: 3 });
    for (let i = 0; i < 7; i += 1) s.enqueue(record(i));
    await s.flush();
    assert.deepEqual(
      mock.requests.map((r) => r.body.length),
      [3, 3, 1]
    );
    const first = mock.requests[0];
    assert.equal(first.method, 'POST');
    assert.equal(first.path, '/v1/ingest/test-dataset');
    assert.match(first.headers['content-type'], /application\/json/);
    assert.ok(first.body[0]._time, 'the time is sent as _time');
    assert.equal(first.body[0].timestamp, undefined);
    assert.equal(s.getStats().ingested, 7);
  });

  test('sends on its own once flushAt records are waiting', async () => {
    const s = shipper({ flushAt: 2 });
    s.enqueue(record(1));
    assert.equal(mock.requests.length, 0);
    s.enqueue(record(2));
    await s.flush();
    assert.equal(mock.requests.length, 1);
    assert.equal(mock.requests[0].body.length, 2);
  });

  test('sends the token in the Authorization header', async () => {
    const s = shipper();
    s.enqueue(record(1));
    await s.flush();
    assert.equal(mock.requests[0].headers.authorization, `Bearer ${TOKEN}`);
  });

  test('retries a 500 and then succeeds', async () => {
    mock.statuses = [500];
    const s = shipper();
    s.enqueue(record(1));
    await s.flush();
    assert.equal(mock.requests.length, 2);
    assert.equal(s.getStats().lastStatus, 200);
    assert.equal(s.getStats().retries, 1);
    assert.equal(s.getStats().ingested, 1);
    assert.equal(s.getStats().lost, 0);
  });

  test('retries a 429, with backoff, at most 3 tries in all', async () => {
    mock.statuses = [429, 429, 429, 429];
    const waits = [];
    const s = shipper({ sleep: async (ms) => waits.push(ms) });
    s.enqueue(record(1));
    await s.flush();
    assert.equal(mock.requests.length, 3);
    assert.deepEqual(waits, [500, 1000]);
    assert.equal(s.getStats().lost, 1);
  });

  test('never retries a 400 (or a 401/403/404)', async () => {
    for (const status of [400, 401, 403, 404]) {
      mock.requests = [];
      mock.statuses = [status];
      const s = shipper();
      s.enqueue(record(1));
      await s.flush();
      assert.equal(mock.requests.length, 1, `HTTP ${status}`);
      assert.equal(s.getStats().lost, 1);
    }
  });

  test('retries network errors, then gives up without throwing', async () => {
    let calls = 0;
    const s = shipper({
      fetchImpl: async () => {
        calls += 1;
        throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
      },
    });
    s.enqueue(record(1));
    await assert.doesNotReject(s.flush());
    assert.equal(calls, 3);
    assert.equal(s.getStats().lost, 1);
  });

  test('when the queue is full the oldest records are dropped and counted', async () => {
    const s = shipper({ maxQueue: 5 });
    for (let i = 0; i < 8; i += 1) s.enqueue(record(i));
    assert.equal(s.getStats().dropped, 3);
    assert.equal(s.getStats().queued, 5);
    await s.flush();
    assert.deepEqual(
      mock.requests[0].body.map((r) => r.n),
      [3, 4, 5, 6, 7]
    );
  });

  test('close() sends what is left (shutdown flush)', async () => {
    const s = shipper({ flushIntervalMs: 60000 });
    s.start();
    s.enqueue(record(1));
    s.enqueue(record(2));
    const stats = await s.close(2000);
    assert.equal(mock.requests.length, 1);
    assert.equal(stats.ingested, 2);
    assert.equal(stats.queued, 0);
  });

  test('close() gives up at its deadline when the service hangs', async () => {
    mock.hang = true;
    const s = shipper({ requestTimeoutMs: 5000 });
    s.enqueue(record(1));
    const started = Date.now();
    await s.close(150);
    assert.ok(Date.now() - started < 1500, 'did not wait for the slow request');
  });

  test('redaction is applied before sending', async () => {
    const s = shipper();
    const token = jwt.sign({ id: 'x' }, crypto.randomBytes(16).toString('hex'));
    s.enqueue(record(1, { password: 'hunter2hunter2', note: `jwt ${token}`, email: 'jane@example.com', message: 'line1\nline2' }));
    await s.flush();
    const sent = JSON.stringify(mock.requests[0].body);
    assert.ok(!sent.includes('hunter2hunter2'));
    assert.ok(!sent.includes(token));
    assert.ok(!sent.includes('jane@example.com'));
    assert.ok(sent.includes('j***@example.com'));
    assert.equal(mock.requests[0].body[0].message, 'line1 line2');
  });
});

describe('failures stay contained', () => {
  test('problems are reported at most once a minute and never include the URL or token', async () => {
    mock.statuses = [403, 403, 403];
    const problems = [];
    let clock = 0;
    const s = shipper({ onProblem: (p) => problems.push(p), now: () => clock });
    for (let i = 0; i < 3; i += 1) {
      s.enqueue(record(i));
      await s.flush();
      clock += 1000;
    }
    assert.equal(problems.length, 1);
    assert.match(problems[0], /HTTP 403/);
    assert.ok(!problems[0].includes(TOKEN) && !problems[0].includes('127.0.0.1') && !problems[0].includes('test-dataset'));

    clock += 60000;
    mock.statuses = [403];
    s.enqueue(record(9));
    await s.flush();
    assert.equal(problems.length, 2);
    assert.match(problems[1], /2 more problem/);
  });

  test('a throwing fetch or reporter never throws out of enqueue or flush', async () => {
    const s = shipper({
      fetchImpl: () => {
        throw new Error('sync boom');
      },
      onProblem: () => {
        throw new Error('reporter boom');
      },
    });
    assert.doesNotThrow(() => s.enqueue(record(1)));
    await assert.doesNotReject(s.flush());
  });

  test('a shipper failure reported through the logger is not shipped (no loop)', async () => {
    mock.statuses = [500, 500, 500];
    const original = { log: console.log, warn: console.warn, error: console.error };
    const printed = [];
    console.log = console.warn = console.error = (line) => printed.push(line);
    try {
      const s = shipper({ onProblem: (p) => logger.local('warn', p) });
      logger.useShipper(s);
      logger.info('one record');
      await s.flush();
      assert.equal(mock.requests.length, 3);
      assert.equal(s.getStats().queued, 0, 'the problem report did not go back into the queue');
      assert.ok(printed.some((line) => /Cloud log shipping: HTTP 500/.test(line)));
    } finally {
      logger.useShipper(null);
      Object.assign(console, original);
    }
  });
});

describe('logger integration', () => {
  test('enableShipping sends scrubbed logger records to the configured service', async () => {
    const original = { log: console.log, warn: console.warn };
    console.log = console.warn = () => {};
    try {
      const result = logger.enableShipping(
        { LOG_SHIPPING_URL: url, LOG_SHIPPING_TOKEN: TOKEN, NODE_ENV: 'test', LOG_SHIPPING_IN_TEST: '1' },
        { sleep: noSleep }
      );
      assert.deepEqual(result, { enabled: true, reason: null });
      logger.event('AUTH_LOGIN_FAILURE', 'Failed login', { reason: 'bad_credentials', email: 'sam@example.com', password: 'nope-nope' });
      await logger.shutdown(2000);
      const [sent] = mock.requests[0].body;
      assert.equal(sent.event, 'AUTH_LOGIN_FAILURE');
      assert.equal(sent.level, 'warn');
      assert.equal(sent.service, 'hustlehub-api');
      assert.equal(sent.email, 's***@example.com');
      assert.equal(sent.password, '[REDACTED]');
    } finally {
      logger.useShipper(null);
      Object.assign(console, original);
    }
  });

  test('enableShipping does nothing when unconfigured', () => {
    assert.equal(logger.enableShipping({}).enabled, false);
    assert.equal(logger.shippingStats(), null);
  });
});
