const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const AuditLog = require('../src/models/AuditLog');

// No database: every guard throws before Mongoose would try to connect.
const id = () => new mongoose.Types.ObjectId();
const validEntry = () => ({
  actorId: id(),
  actorRole: 'admin',
  action: 'admin_gig_deleted',
  targetType: 'gig',
  targetId: id(),
  outcome: 'success',
  ip: '203.0.113.7',
});

const APPEND_ONLY = /append-only/;

describe('append-only guards', () => {
  const queryOps = [
    ['updateOne', () => AuditLog.updateOne({}, { $set: { outcome: 'failure' } })],
    ['updateMany', () => AuditLog.updateMany({}, { $set: { outcome: 'failure' } })],
    ['findOneAndUpdate', () => AuditLog.findOneAndUpdate({}, { $set: { outcome: 'failure' } })],
    ['findByIdAndUpdate', () => AuditLog.findByIdAndUpdate(id(), { $set: { outcome: 'failure' } })],
    ['replaceOne', () => AuditLog.replaceOne({}, validEntry())],
    ['findOneAndReplace', () => AuditLog.findOneAndReplace({}, validEntry())],
    ['deleteOne', () => AuditLog.deleteOne({})],
    ['deleteMany', () => AuditLog.deleteMany({})],
    ['findOneAndDelete', () => AuditLog.findOneAndDelete({})],
    ['findByIdAndDelete', () => AuditLog.findByIdAndDelete(id())],
  ];
  for (const [name, run] of queryOps) {
    test(`${name} is refused`, async () => {
      await assert.rejects(run().exec(), APPEND_ONLY);
    });
  }

  test('bulkWrite is refused', async () => {
    await assert.rejects(AuditLog.bulkWrite([{ deleteMany: { filter: {} } }]), APPEND_ONLY);
  });

  test('saving an existing entry again is refused', async () => {
    const entry = new AuditLog(validEntry());
    entry.isNew = false; // as if it had been loaded from the database
    entry.outcome = 'failure';
    await assert.rejects(entry.save(), APPEND_ONLY);
  });

  test('deleting or updating a loaded entry is refused', async () => {
    const entry = new AuditLog(validEntry());
    entry.isNew = false;
    await assert.rejects(entry.deleteOne(), APPEND_ONLY);
    await assert.rejects(entry.updateOne({ $set: { outcome: 'failure' } }), APPEND_ONLY);
  });
});

describe('what an entry may contain', () => {
  test('a valid entry passes validation', async () => {
    await new AuditLog(validEntry()).validate();
  });

  test('only known actions are accepted', async () => {
    await assert.rejects(new AuditLog({ ...validEntry(), action: 'something_else' }).validate());
  });

  test('unknown fields (like an email or a request body) are refused', async () => {
    // Top-level: refused as soon as the entry is built.
    assert.throws(() => new AuditLog({ ...validEntry(), email: 'a@example.com' }), { name: 'StrictModeError' });
    // Inside meta: refused when the entry is validated, i.e. before any save.
    await assert.rejects(new AuditLog({ ...validEntry(), meta: { password: 'secret' } }).validate(), { name: 'ValidationError' });
  });

  test('the whitelisted meta fields are allowed', async () => {
    await new AuditLog({ ...validEntry(), action: 'account_locked', targetType: 'user', meta: { failedAttempts: 5, lockMinutes: 15 } }).validate();
  });

  test('has the newest-first indexes', () => {
    const indexes = AuditLog.schema.indexes().map(([fields]) => fields);
    assert.deepEqual(indexes, [{ createdAt: -1 }, { action: 1, createdAt: -1 }]);
  });
});
