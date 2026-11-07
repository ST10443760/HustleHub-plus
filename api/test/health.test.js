const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// The health route never touches the database, so the app can be loaded
// and called without MongoDB.
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('GET /api/health says ok and nothing else', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { success: true, data: { status: 'ok' } });
});

test('the health check still gets the security headers', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('the health check is not rate limited', async () => {
  // More calls than the general limiter allows (100 per window).
  for (let i = 0; i < 110; i += 1) {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('ratelimit'), null);
  }
  // Other API routes are still behind the general limiter.
  const other = await fetch(`${baseUrl}/api/nope`);
  assert.ok(other.headers.get('ratelimit-policy'));
});
