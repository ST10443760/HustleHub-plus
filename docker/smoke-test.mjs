#!/usr/bin/env node
/**
 * Smoke test for the Docker stack. Node 22+, no dependencies, works the
 * same on Windows and Linux. Talks to the stack only through the client
 * container (nginx), exactly like a browser would.
 *
 *   node docker/smoke-test.mjs
 *
 * Settings (environment variables, all optional):
 *   SMOKE_BASE_URL    client URL           default http://localhost:5173
 *   SMOKE_TIMEOUT_MS  wait for the stack   default 120000
 *
 * Exits 0 when every check passes, 1 on the first failure.
 *
 * It registers one throwaway client (test-smoke-...@example.com), changes
 * its password (checking the old token stops working), which
 * `npm run clean:test` removes. Registration is rate limited to 10 per hour
 * per IP, so running this more than 10 times an hour against the normal
 * stack gets a 429 (the test override relaxes the limit).
 */
import { randomBytes } from 'node:crypto';

const BASE_URL = (process.env.SMOKE_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS) || 120000;
const REQUEST_TIMEOUT_MS = 10000;

let passed = 0;

function pass(message) {
  passed += 1;
  console.log(`  PASS  ${message}`);
}

function fail(message) {
  console.error(`  FAIL  ${message}`);
  console.error(`\nSmoke test failed after ${passed} passing check(s).`);
  process.exit(1);
}

function check(condition, message, detail = '') {
  if (condition) pass(message);
  else fail(detail ? `${message} (${detail})` : message);
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON (e.g. the HTML page)
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function waitForStack() {
  const deadline = Date.now() + TIMEOUT_MS;
  let lastProblem = 'no answer yet';
  while (Date.now() < deadline) {
    try {
      const res = await request('/api/health');
      if (res.status === 200) return;
      lastProblem = `HTTP ${res.status}`;
    } catch (err) {
      lastProblem = err.cause?.code || err.name || 'connection failed';
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  fail(`stack did not answer ${BASE_URL}/api/health within ${TIMEOUT_MS / 1000}s (last: ${lastProblem})`);
}

async function main() {
  console.log(`Smoke testing ${BASE_URL}\n`);

  await waitForStack();
  pass('stack is up');

  // 1. The client page, with its security headers.
  const page = await request('/');
  check(page.status === 200, 'client page returns 200', `got ${page.status}`);
  const csp = page.headers.get('content-security-policy') || '';
  check(csp.includes("default-src 'self'"), 'client page sends a Content-Security-Policy header', csp || 'missing');
  check(csp.includes("frame-ancestors 'none'"), 'the CSP header includes frame-ancestors');
  check(page.text.includes('<div id="root">'), 'client page is the React app');

  // 2. The API through the client's /api proxy.
  const health = await request('/api/health');
  check(
    health.status === 200 && health.json?.success === true && health.json?.data?.status === 'ok',
    'GET /api/health through the client proxy says ok',
    `got ${health.status} ${health.text.slice(0, 80)}`
  );

  // 3. Register and log in a throwaway client.
  const email = `test-smoke-${Date.now()}-${randomBytes(3).toString('hex')}@example.com`;
  const password = `Smoke${randomBytes(6).toString('hex')}1`;
  const registered = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Smoke Test', email, password, role: 'client' },
  });
  check(registered.status === 201, 'register a new client', `got ${registered.status} ${registered.json?.error || ''}`);

  const login = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  const token = login.json?.data?.token;
  check(login.status === 200 && typeof token === 'string', 'log in and get a token', `got ${login.status}`);

  // 4. Protected route with and without the token.
  const me = await request('/api/auth/me', { token });
  check(me.status === 200, 'protected route with the token returns 200', `got ${me.status}`);

  const anonymous = await request('/api/auth/me');
  check(anonymous.status === 401, 'protected route without a token returns 401', `got ${anonymous.status}`);

  // 5. Admin-only route as a client.
  const admin = await request('/api/admin/users', { token });
  check(admin.status === 403, 'admin-only route as a client returns 403', `got ${admin.status}`);

  // 6. Change the password: the old session ends, the new token works.
  const newPassword = `Smoke${randomBytes(6).toString('hex')}2`;
  const changed = await request('/api/auth/change-password', {
    method: 'POST',
    token,
    body: { currentPassword: password, newPassword },
  });
  const newToken = changed.json?.data?.token;
  check(changed.status === 200 && typeof newToken === 'string', 'change the password and get a fresh token', `got ${changed.status}`);
  check((await request('/api/auth/me', { token })).status === 401, 'the token from before the change no longer works');
  check((await request('/api/auth/me', { token: newToken })).status === 200, 'the new token works');

  // Nothing secret in any of the answers.
  const everything = [registered, login, me, anonymous, admin, changed].map((r) => r.text).join('\n');
  check(!/passwordHash|\.js:\d+/.test(everything), 'no password hashes or stack traces in the responses');

  console.log(`\nSmoke test passed: ${passed} checks.`);
}

main().catch((err) => fail(`unexpected error: ${err.message}`));
