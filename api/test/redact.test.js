const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { scrub, scrubString, REDACTED, MAX_STRING, MAX_DEPTH, MAX_KEYS, MAX_ITEMS } = require('../src/utils/redact');

// Secret-looking values are made at run time, so no fixture in the repo
// looks like a real credential to a secret scanner.
const randomHex = (n = 16) => crypto.randomBytes(n).toString('hex');
const fakeJwt = () => jwt.sign({ id: 'x' }, randomHex());
const fakeAxiomToken = () => `xaat-${crypto.randomUUID()}`;

describe('sensitive keys', () => {
  test('values under sensitive keys are redacted, whatever the case', () => {
    const out = scrub({
      password: 'hunter2hunter2',
      currentPassword: 'a',
      newPassword: 'b',
      passwordHash: '$2a$12$abc',
      token: 't',
      LOG_SHIPPING_TOKEN: 't',
      JWT_SECRET: 's',
      Authorization: 'Bearer x',
      cookie: 'sid=1',
      jwt: 'j',
      MONGO_URI: 'mongodb://h/db',
      'x-api-key': 'k',
      apiKey: 'k',
      api_key: 'k',
      safe: 'kept',
    });
    for (const [key, value] of Object.entries(out)) {
      if (key === 'safe') assert.equal(value, 'kept');
      else assert.equal(value, REDACTED, key);
    }
  });

  test('sensitive keys are redacted deep inside objects and arrays', () => {
    const out = scrub({ a: { b: [{ c: { secret: 'deep' } }] } });
    assert.equal(out.a.b[0].c.secret, REDACTED);
  });
});

describe('secrets inside strings', () => {
  test('JWTs are redacted', () => {
    const token = fakeJwt();
    const out = scrubString(`token was ${token} ok`);
    assert.ok(!out.includes(token));
    assert.match(out, /\[REDACTED_JWT\]/);
  });

  test('Axiom tokens are redacted', () => {
    const token = fakeAxiomToken();
    const out = scrubString(`using ${token}`);
    assert.ok(!out.includes(token));
    assert.match(out, /\[REDACTED_TOKEN\]/);
  });

  test('Bearer values are redacted', () => {
    const value = randomHex();
    assert.equal(scrubString(`Bearer ${value}`), 'Bearer [REDACTED]');
  });

  test('credentials inside connection strings are redacted, the host is kept', () => {
    const password = randomHex();
    for (const scheme of ['mongodb', 'mongodb+srv', 'postgres']) {
      const out = scrubString(`connect failed: ${scheme}://appuser:${password}@cluster0.example.net/db`);
      assert.ok(!out.includes(password), scheme);
      assert.ok(!out.includes('appuser'), scheme);
      assert.ok(out.includes(`${scheme}://[REDACTED]@cluster0.example.net/db`), out);
    }
  });

  test('emails are masked in the existing style, and masking twice changes nothing', () => {
    const once = scrubString('login by jane.doe@example.com failed');
    assert.equal(once, 'login by j***@example.com failed');
    assert.equal(scrubString(once), once);
  });
});

describe('log injection', () => {
  test('CR, LF and other control characters become spaces', () => {
    const out = scrubString('ok\r\n[2026-01-01] [EVENT:AUTH_LOGIN_SUCCESS] forged\u0000\u001b[31m\u2028');
    const control = [...out].filter((c) => c.codePointAt(0) < 32 || c === '\u2028');
    assert.deepEqual(control, []);
    assert.match(out, /^ok {2}\[2026/);
  });

  test('control characters in keys are removed too', () => {
    const out = scrub({ 'bad\nkey': 1 });
    assert.deepEqual(Object.keys(out), ['bad key']);
  });
});

describe('size and shape limits', () => {
  test('long strings are cut', () => {
    const out = scrubString('a'.repeat(MAX_STRING * 3));
    assert.ok(out.length < MAX_STRING + 20);
    assert.match(out, /\.\.\.\[truncated\]$/);
  });

  test('depth is capped', () => {
    let deep = { leaf: true };
    for (let i = 0; i < MAX_DEPTH + 5; i += 1) deep = { child: deep };
    assert.match(JSON.stringify(scrub(deep)), /\[MaxDepth\]/);
  });

  test('wide objects and long arrays are capped', () => {
    const wide = Object.fromEntries(Array.from({ length: MAX_KEYS + 10 }, (_, i) => [`k${i}`, i]));
    const out = scrub(wide);
    assert.equal(out._truncatedKeys, 10);
    const list = scrub(Array.from({ length: MAX_ITEMS + 5 }, (_, i) => i));
    assert.equal(list.length, MAX_ITEMS + 1);
    assert.equal(list.at(-1), '[5 more]');
  });

  test('circular references are marked, not followed', () => {
    const a = { name: 'a' };
    a.self = a;
    a.list = [a];
    const out = scrub(a);
    assert.equal(out.self, '[Circular]');
    assert.equal(out.list[0], '[Circular]');
  });

  test('a shared (non-circular) object is logged in both places', () => {
    const shared = { n: 1 };
    assert.deepEqual(scrub({ a: shared, b: shared }), { a: { n: 1 }, b: { n: 1 } });
  });
});

describe('special values', () => {
  test('an Error becomes its name and message only: no stack, no file paths', () => {
    const err = new TypeError(`boom at mongodb://u:${randomHex()}@h`);
    const out = scrub({ err });
    assert.deepEqual(Object.keys(out.err), ['name', 'message']);
    assert.equal(out.err.name, 'TypeError');
    assert.match(out.err.message, /mongodb:\/\/\[REDACTED\]@h/);
    assert.ok(!JSON.stringify(out).includes('.js:'));
  });

  test('dates, ObjectIds, buffers, bigints, functions and odd numbers are handled', () => {
    const id = new mongoose.Types.ObjectId();
    const out = scrub({
      when: new Date('2026-01-02T03:04:05Z'),
      id,
      buf: Buffer.from('secret'),
      big: 10n,
      fn: () => 1,
      nan: Number.NaN,
      inf: Infinity,
      nothing: null,
    });
    assert.deepEqual(out, {
      when: '2026-01-02T03:04:05.000Z',
      id: id.toString(),
      buf: '[Binary]',
      big: '10',
      nan: 'NaN',
      inf: 'Infinity',
      nothing: null,
    });
  });

  test('objects with toJSON (like Mongoose documents) are logged in their JSON form', () => {
    class Doc {
      toJSON() {
        return { id: '1', name: 'Gig' };
      }
    }
    assert.deepEqual(scrub({ doc: new Doc() }), { doc: { id: '1', name: 'Gig' } });
  });

  test('never throws, even when reading the value throws', () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('no');
        },
      }
    );
    assert.doesNotThrow(() => scrub(hostile));
    assert.equal(scrub(hostile), '[Unloggable]');
    const getterBomb = Object.defineProperty({}, 'x', {
      enumerable: true,
      get() {
        throw new Error('no');
      },
    });
    assert.doesNotThrow(() => scrub(getterBomb));
  });
});
