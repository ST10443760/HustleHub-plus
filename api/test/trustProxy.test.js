const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const express = require('express');
const { resolveTrustProxy } = require('../src/config/proxy');
const { createLimiter } = require('../src/middleware/rateLimiters');

describe('resolveTrustProxy', () => {
  test('is off when unset, empty, 0 or false', () => {
    for (const value of [undefined, '', '0', 'false', 'FALSE', '  ']) {
      assert.equal(resolveTrustProxy({ TRUST_PROXY: value }), false);
    }
    assert.equal(resolveTrustProxy({}), false);
  });

  test('accepts a number of hops', () => {
    assert.equal(resolveTrustProxy({ TRUST_PROXY: '1' }), 1);
    assert.equal(resolveTrustProxy({ TRUST_PROXY: ' 2 ' }), 2);
  });

  test('rejects "true", IP lists and nonsense', () => {
    for (const value of ['true', 'loopback', '10.0.0.0/8', '-1', '1.5', '99']) {
      assert.throws(() => resolveTrustProxy({ TRUST_PROXY: value }), /TRUST_PROXY must be/);
    }
  });
});

// A tiny app with one limiter (2 requests per minute), trust proxy as given.
async function startLimitedApp(trustProxy) {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.use(createLimiter('test', { windowMs: 60000, max: 2 }));
  app.get('/', (req, res) => res.json({ ip: req.ip }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const call = (forwardedFor) => fetch(url, { headers: { 'X-Forwarded-For': forwardedFor } });
  return { call, close: () => new Promise((resolve) => server.close(resolve)) };
}

// Collects console.error / console.warn output while `fn` runs. The app's
// own warnings (RATE_LIMIT_EXCEEDED, the access log) go there too, so the
// tests below only look for express-rate-limit's validation warnings.
async function captureWarnings(fn) {
  const seen = [];
  const original = { error: console.error, warn: console.warn };
  console.error = (...args) => seen.push(args.map(String).join(' '));
  console.warn = (...args) => seen.push(args.map(String).join(' '));
  try {
    await fn();
  } finally {
    Object.assign(console, original);
  }
  return seen;
}

describe('rate limit buckets behind a proxy', () => {
  test('with TRUST_PROXY=1, two forwarded addresses get separate buckets', async () => {
    const app = await startLimitedApp(resolveTrustProxy({ TRUST_PROXY: '1' }));
    try {
      const warnings = await captureWarnings(async () => {
        assert.equal((await app.call('203.0.113.1')).status, 200);
        assert.equal((await app.call('203.0.113.1')).status, 200);
        assert.equal((await app.call('203.0.113.1')).status, 429); // first client is out
        const other = await app.call('203.0.113.2');
        assert.equal(other.status, 200); // second client still has its own allowance
        assert.equal((await other.json()).ip, '203.0.113.2');
      });
      assert.deepEqual(
        warnings.filter((w) => /ERR_ERL|ValidationError/.test(w)),
        [],
        'express-rate-limit should not log validation warnings'
      );
    } finally {
      await app.close();
    }
  });

  test('without TRUST_PROXY, everyone behind the proxy shares one bucket', async () => {
    const app = await startLimitedApp(resolveTrustProxy({}));
    try {
      // express-rate-limit rightly warns that X-Forwarded-For is being
      // ignored; that warning is the reason TRUST_PROXY exists.
      const warnings = await captureWarnings(async () => {
        assert.equal((await app.call('203.0.113.1')).status, 200);
        assert.equal((await app.call('203.0.113.1')).status, 200);
        assert.equal((await app.call('203.0.113.2')).status, 429); // a different user is blocked too
      });
      assert.ok(warnings.some((w) => w.includes('ERR_ERL_UNEXPECTED_X_FORWARDED_FOR')));
    } finally {
      await app.close();
    }
  });
});

test('the real app with TRUST_PROXY=1 logs no rate limiter validation warnings', async () => {
  // Fresh process so the real limiters are built with this setting.
  const script = `
    const http = require('http');
    const app = require(${JSON.stringify(path.join(__dirname, '..', 'src', 'app'))});
    const server = http.createServer(app).listen(0, '127.0.0.1', async () => {
      const url = 'http://127.0.0.1:' + server.address().port + '/api/nope';
      for (const ip of ['203.0.113.1', '203.0.113.2', '203.0.113.1']) {
        await fetch(url, { headers: { 'X-Forwarded-For': ip } });
      }
      server.close();
    });`;
  const child = spawn(process.execPath, ['-e', script], {
    env: { ...process.env, TRUST_PROXY: '1', CLIENT_ORIGIN: 'http://localhost:5173', NODE_ENV: 'test' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const code = await new Promise((resolve) => child.on('close', resolve));

  assert.equal(code, 0);
  assert.doesNotMatch(output, /ERR_ERL|ValidationError/);
});
