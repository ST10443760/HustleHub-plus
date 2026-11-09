const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const logger = require('../src/utils/logger');
const { runWithContext } = require('../src/utils/requestContext');
const { EVENT_NAMES, defaultLevel } = require('../src/utils/logEvents');

// Captures what the logger prints while `fn` runs, with LOG_FORMAT set.
function capture(format, fn) {
  const lines = [];
  const original = { log: console.log, warn: console.warn, error: console.error, format: process.env.LOG_FORMAT };
  console.log = console.warn = console.error = (line) => lines.push(line);
  process.env.LOG_FORMAT = format;
  try {
    fn();
  } finally {
    Object.assign(console, { log: original.log, warn: original.warn, error: original.error });
    if (original.format === undefined) delete process.env.LOG_FORMAT;
    else process.env.LOG_FORMAT = original.format;
  }
  return lines;
}

describe('record shape', () => {
  test('every record has the standard fields, plus the request context', () => {
    const context = { requestId: 'rid-1', ip: '203.0.113.5', method: 'POST', path: '/api/bookings', userId: 'u1', role: 'client' };
    const [line] = capture('json', () =>
      runWithContext(context, () => logger.event('BOOKING_CREATED', 'Booking created', { bookingId: 'b1', price: 250 }))
    );
    const record = JSON.parse(line);
    assert.deepEqual(Object.keys(record).slice(0, 6), ['timestamp', 'level', 'event', 'message', 'service', 'env']);
    assert.equal(record.event, 'BOOKING_CREATED');
    assert.equal(record.level, 'info');
    assert.equal(record.service, 'hustlehub-api');
    assert.match(record.timestamp, /^\d{4}-\d\d-\d\dT/);
    assert.equal(record.requestId, 'rid-1');
    assert.equal(record.userId, 'u1');
    assert.equal(record.role, 'client');
    assert.equal(record.ip, '203.0.113.5');
    assert.equal(record.method, 'POST');
    assert.equal(record.path, '/api/bookings');
    assert.equal(record.bookingId, 'b1');
    assert.equal(record.price, 250);
  });

  test('outside a request there are no request fields', () => {
    const [line] = capture('json', () => logger.info('started'));
    const record = JSON.parse(line);
    assert.equal(record.event, 'APP_LOG');
    assert.equal(record.requestId, undefined);
  });

  test('callers cannot overwrite the standard fields', () => {
    const [line] = capture('json', () => logger.event('GIG_CREATED', 'Gig created', { level: 'error', event: 'X', service: 'evil', timestamp: 'never' }));
    const record = JSON.parse(line);
    assert.equal(record.level, 'info');
    assert.equal(record.event, 'GIG_CREATED');
    assert.equal(record.service, 'hustlehub-api');
    assert.notEqual(record.timestamp, 'never');
  });

  test('events use the catalogue level unless overridden', () => {
    const lines = capture('json', () => {
      logger.event('AUTH_LOGIN_FAILURE', 'x');
      logger.event('ERROR_UNHANDLED', 'x');
      logger.event('AUTH_REGISTER', 'x', {}, { level: 'warn' });
    });
    assert.deepEqual(
      lines.map((l) => JSON.parse(l).level),
      ['warn', 'error', 'warn']
    );
  });

  test('records are scrubbed before they are printed', () => {
    const [line] = capture('json', () =>
      logger.event('AUTH_LOGIN_FAILURE', 'Failed login\r\n[EVENT:AUTH_LOGIN_SUCCESS] forged', { password: 'pw-pw-pw', email: 'kim@example.com' })
    );
    const record = JSON.parse(line);
    assert.equal(record.password, '[REDACTED]');
    assert.equal(record.email, 'k***@example.com');
    assert.ok(!/[\r\n]/.test(record.message));
  });

  test('an oversized record keeps its headline fields only', () => {
    const big = Object.fromEntries(Array.from({ length: 45 }, (_, i) => [`f${i}`, 'x'.repeat(500)]));
    const [line] = capture('json', () => logger.event('GIG_UPDATED', 'Gig updated', big));
    const record = JSON.parse(line);
    assert.equal(record.truncated, true);
    assert.equal(record.event, 'GIG_UPDATED');
    assert.equal(record.f0, undefined);
  });
});

describe('formats', () => {
  test('pretty keeps the readable one-line style, with a short request id', () => {
    const [line] = capture('pretty', () =>
      runWithContext({ requestId: 'abcdef12-3456' }, () => logger.event('AUTH_LOCKOUT', 'Account locked', { lockMinutes: 15 }))
    );
    assert.match(line, /^\[\d{4}-[^\]]+\] \[EVENT:AUTH_LOCKOUT\] Account locked \{"lockMinutes":15\} \(req abcdef12\)$/);
  });

  test('pretty plain logs use the level as the label', () => {
    const [line] = capture('pretty', () => logger.warn('careful'));
    assert.match(line, /\[WARN\] careful$/);
  });

  test('LOG_FORMAT picks the format; json is the default in production', () => {
    assert.equal(logger.resolveFormat({ LOG_FORMAT: 'json' }), 'json');
    assert.equal(logger.resolveFormat({ LOG_FORMAT: 'PRETTY', NODE_ENV: 'production' }), 'pretty');
    assert.equal(logger.resolveFormat({ NODE_ENV: 'production' }), 'json');
    assert.equal(logger.resolveFormat({ NODE_ENV: 'development' }), 'pretty');
    assert.equal(logger.resolveFormat({ LOG_FORMAT: 'xml' }), 'pretty');
  });

  test('access lines are levelled by status', () => {
    const lines = capture('json', () => {
      const context = { requestId: 'r', method: 'GET', path: '/api/gigs' };
      logger.access(context, { status: 200, durationMs: 3.2, aborted: false });
      logger.access(context, { status: 404, durationMs: 1, aborted: false });
      logger.access(context, { status: 503, durationMs: 1, aborted: false });
    });
    const records = lines.map((l) => JSON.parse(l));
    assert.deepEqual(
      records.map((r) => [r.event, r.level, r.status]),
      [
        ['HTTP_REQUEST', 'info', 200],
        ['HTTP_REQUEST', 'warn', 404],
        ['HTTP_REQUEST', 'error', 503],
      ]
    );
    assert.equal(records[0].durationMs, 3.2);
  });
});

describe('event catalogue', () => {
  test('has the required event names', () => {
    for (const name of [
      'AUTH_REGISTER',
      'AUTH_LOGIN_SUCCESS',
      'AUTH_LOGIN_FAILURE',
      'AUTH_LOCKOUT',
      'AUTH_PASSWORD_CHANGED',
      'AUTH_LOGOUT_ALL',
      'ACCESS_DENIED',
      'RATE_LIMIT_EXCEEDED',
      'VALIDATION_FAILED',
      'GIG_CREATED',
      'GIG_UPDATED',
      'GIG_DELETED',
      'BOOKING_CREATED',
      'TRANSACTION_CREATED',
      'ADMIN_ACTION',
      'AUDIT_WRITE_FAILED',
      'ERROR_UNHANDLED',
      'SERVER_START',
    ]) {
      assert.ok(EVENT_NAMES.includes(name), name);
    }
    assert.equal(defaultLevel('NOT_AN_EVENT'), 'info');
  });

  // Searches the code with git (tracked and new files). Every call keeps
  // logger.event('NAME' on one line, so this finds them all.
  test('every logger.event() call in the code uses a catalogue name', (t) => {
    const search = spawnSync('git', ['grep', '--untracked', '-h', '-o', '-E', "logger\\.event\\('[A-Z_]+'", '--', 'src', 'scripts'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
    });
    if (search.error || search.status !== 0) return t.skip('git is not available');
    const used = new Set([...search.stdout.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]));
    assert.ok(used.size >= 20, `found ${used.size} event names`);
    for (const name of used) assert.ok(EVENT_NAMES.includes(name), `${name} is not in utils/logEvents.js`);
  });
});

test('a logging failure never throws into the caller', () => {
  const original = console.log;
  console.log = () => {
    throw new Error('stdout closed');
  };
  try {
    assert.doesNotThrow(() => logger.info('x'));
  } finally {
    console.log = original;
  }
});
