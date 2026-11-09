const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recordAudit } = require('../src/utils/audit');

const req = { user: { id: '6aee7111de401ed6299616b7', role: 'admin' }, ip: '203.0.113.9' };

// Captures console output (the logger writes there) while `fn` runs.
async function captureLogs(fn) {
  const lines = [];
  const original = { log: console.log, error: console.error };
  console.log = (...a) => lines.push(a.join(' '));
  console.error = (...a) => lines.push(a.join(' '));
  try {
    return { result: await fn(), lines };
  } finally {
    Object.assign(console, original);
  }
}

test('writes the actor and ip from the verified request', async () => {
  const written = [];
  const model = { create: async (doc) => written.push(doc) };
  const ok = await recordAudit(req, { action: 'logout_all', targetType: 'user', targetId: req.user.id }, { model });
  assert.equal(ok, true);
  assert.deepEqual(written[0], {
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'logout_all',
    targetType: 'user',
    targetId: req.user.id,
    outcome: 'success',
    ip: '203.0.113.9',
    meta: undefined,
  });
});

test('uses an explicit actor when nobody is logged in (lockout)', async () => {
  const written = [];
  const model = { create: async (doc) => written.push(doc) };
  const actor = { id: '6aee7111de401ed6299616b8', role: 'client' };
  await recordAudit({ ip: '198.51.100.1' }, { actor, action: 'account_locked', targetType: 'user', targetId: actor.id }, { model });
  assert.equal(written[0].actorId, actor.id);
  assert.equal(written[0].actorRole, 'client');
});

test('a failed write is logged as an error event and never throws', async () => {
  const model = {
    create: async () => {
      const err = new Error('connection refused to mongodb://user:secret@host');
      err.name = 'MongoNetworkError';
      throw err;
    },
  };
  const { result, lines } = await captureLogs(() =>
    recordAudit(req, { action: 'password_changed', targetType: 'user', targetId: req.user.id }, { model })
  );
  assert.equal(result, false);
  const line = lines.join('\n');
  assert.match(line, /EVENT:AUDIT_WRITE_FAILED\] Audit log write failed/);
  assert.match(line, /"action":"password_changed"/);
  assert.match(line, /"errorName":"MongoNetworkError"/);
  // The raw error message (which can contain connection details) is not logged.
  assert.doesNotMatch(line, /secret|mongodb:\/\//);
});
