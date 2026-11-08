const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { isLocked, claimAttempt, claimAttemptUpdate, RESET_STATE } = require('../src/utils/lockout');
const { STRICT_LOCKOUT, resolveLockoutPolicy } = require('../src/config/lockout');

const MINUTE = 60 * 1000;
const policy = STRICT_LOCKOUT; // 5 attempts / 15 min window / 15 min lock
const at = (minutes) => new Date(Date.UTC(2026, 10, 8, 10, 0, 0) + minutes * MINUTE);

// Claims `n` attempts one minute apart, starting at minute `start`.
function claimMany(state, n, start = 0) {
  let current = state;
  const results = [];
  for (let i = 0; i < n; i += 1) {
    const next = claimAttempt(current, at(start + i), policy);
    results.push(next);
    if (next) current = next;
  }
  return { state: current, results };
}

describe('lock decision', () => {
  test('a fresh account (no lockout fields at all) is not locked', () => {
    assert.equal(isLocked({}, at(0)), false);
    assert.equal(isLocked(undefined, at(0)), false);
    const first = claimAttempt({}, at(0), policy);
    assert.equal(first.failedLoginAttempts, 1);
    assert.equal(first.allowed, true);
    assert.equal(first.lockUntil, null);
  });

  test('the 5th attempt inside the window locks the account for 15 minutes', () => {
    const { state, results } = claimMany({}, 5);
    assert.deepEqual(results.map((r) => r.failedLoginAttempts), [1, 2, 3, 4, 5]);
    assert.deepEqual(results.map((r) => r.locksNow), [false, false, false, false, true]);
    assert.ok(results.every((r) => r.allowed), 'all five may check the password');
    assert.equal(state.lockUntil.getTime(), at(4 + 15).getTime());
    assert.equal(isLocked(state, at(5)), true);
  });

  test('while locked, no attempt is claimed (the password is never checked)', () => {
    const { state } = claimMany({}, 5);
    assert.equal(claimAttempt(state, at(10), policy), null);
    assert.equal(claimAttempt(state, at(18), policy), null);
  });

  test('the lock expires after 15 minutes and counting starts again', () => {
    const { state } = claimMany({}, 5); // locked until minute 19
    assert.equal(isLocked(state, at(19)), false);
    const next = claimAttempt(state, at(19), policy);
    assert.equal(next.failedLoginAttempts, 1);
    assert.equal(next.lockUntil, null);
  });

  test('failures older than the window do not count', () => {
    const { state } = claimMany({}, 4); // minutes 0-3
    const later = claimAttempt(state, at(15), policy); // window started at minute 0
    assert.equal(later.failedLoginAttempts, 1);
    assert.equal(later.firstFailedLoginAt.getTime(), at(15).getTime());
  });

  test('failures just inside the window still count', () => {
    const { state } = claimMany({}, 4); // minutes 0-3
    const last = claimAttempt(state, at(14), policy);
    assert.equal(last.failedLoginAttempts, 5);
    assert.equal(last.locksNow, true);
  });

  test('slow guessing (one try every 4 minutes) is still caught inside one window', () => {
    let state = {};
    for (const minute of [0, 4, 8, 12]) state = claimAttempt(state, at(minute), policy);
    assert.equal(claimAttempt(state, at(14), policy).locksNow, true);
  });

  test('a successful login resets everything', () => {
    const { state } = claimMany({}, 4);
    const afterSuccess = { ...state, ...RESET_STATE };
    assert.equal(isLocked(afterSuccess, at(5)), false);
    assert.equal(claimAttempt(afterSuccess, at(5), policy).failedLoginAttempts, 1);
  });

  test('an attempt past the limit is never allowed to check the password', () => {
    // Only reachable if a lock has somehow not been set; the guard holds anyway.
    const state = { failedLoginAttempts: 5, firstFailedLoginAt: at(0), lockUntil: null };
    const next = claimAttempt(state, at(1), policy);
    assert.equal(next.failedLoginAttempts, 6);
    assert.equal(next.allowed, false);
  });
});

describe('atomic update', () => {
  test('only matches an unlocked account', () => {
    const { filter } = claimAttemptUpdate(at(0), policy);
    assert.deepEqual(filter, { $or: [{ lockUntil: null }, { lockUntil: { $lte: at(0) } }] });
  });

  test('counts in the first stage and locks at the limit in the second', () => {
    const { update } = claimAttemptUpdate(at(0), policy);
    assert.equal(update.length, 2);
    assert.ok(update[0].$set.failedLoginAttempts);
    assert.deepEqual(update[1].$set.lockUntil.$cond[0], { $gte: ['$failedLoginAttempts', 5] });
    assert.equal(update[1].$set.lockUntil.$cond[1].getTime(), at(15).getTime());
  });
});

describe('lockout policy', () => {
  test('defaults to 5 attempts, 15 minute window, 15 minute lock', () => {
    const { policy: p } = resolveLockoutPolicy({});
    assert.deepEqual(p, { maxAttempts: 5, windowMs: 15 * MINUTE, lockMs: 15 * MINUTE });
  });

  test('can be changed outside production', () => {
    const { policy: p } = resolveLockoutPolicy({ LOCKOUT_MAX_ATTEMPTS: '3', LOCKOUT_DURATION_MINUTES: '1' });
    assert.equal(p.maxAttempts, 3);
    assert.equal(p.lockMs, MINUTE);
  });

  test('overrides are ignored in production', () => {
    const { policy: p, ignoredOverrides } = resolveLockoutPolicy({ NODE_ENV: 'production', LOCKOUT_MAX_ATTEMPTS: '1000' });
    assert.equal(p.maxAttempts, 5);
    assert.deepEqual(ignoredOverrides, ['LOCKOUT_MAX_ATTEMPTS']);
  });

  test('ignores values that are not positive whole numbers', () => {
    const { policy: p } = resolveLockoutPolicy({ LOCKOUT_MAX_ATTEMPTS: '0', LOCKOUT_WINDOW_MINUTES: 'abc', LOCKOUT_DURATION_MINUTES: '2.5' });
    assert.deepEqual(p, { ...STRICT_LOCKOUT });
  });
});
