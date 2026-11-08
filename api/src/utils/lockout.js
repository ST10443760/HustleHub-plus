/**
 * Account lockout decisions, as pure functions with the clock passed in
 * (so they can be unit tested), plus the matching atomic MongoDB update.
 *
 * Every login attempt for an existing account first CLAIMS an attempt:
 * one findOneAndUpdate that only matches an unlocked account, counts the
 * attempt and, on the attempt that reaches the limit, sets lockUntil. The
 * password is only checked after a successful claim, and only while the
 * count is within the limit. Parallel requests each get their own count
 * from the database, so they can never test more passwords than allowed.
 * A successful login then resets the counters.
 *
 * State (on the User document, never in a response or a token):
 *   failedLoginAttempts  attempts in the current window
 *   firstFailedLoginAt   start of the current window
 *   lastFailedLoginAt    most recent attempt that wasn't followed by a success
 *   lockUntil            locked until this time (if in the future)
 */

const toTime = (value) => (value instanceof Date ? value.getTime() : value == null ? null : new Date(value).getTime());

// Is the account locked right now?
function isLocked(state, now) {
  const until = toTime(state && state.lockUntil);
  return until !== null && until > now.getTime();
}

/**
 * The state after claiming one more attempt at time `now`, or null if the
 * account is locked (nothing changes then). `allowed` says whether the
 * password may be checked; `locksNow` is true on the attempt that reaches
 * the limit (it locks the account if the password turns out to be wrong).
 */
function claimAttempt(state, now, policy) {
  if (isLocked(state, now)) return null;

  const first = toTime(state && state.firstFailedLoginAt);
  const lockExpired = toTime(state && state.lockUntil) !== null; // there was a lock and it is over
  const inWindow = !lockExpired && first !== null && first > now.getTime() - policy.windowMs;

  const failedLoginAttempts = inWindow ? (state.failedLoginAttempts || 0) + 1 : 1;
  const locksNow = failedLoginAttempts >= policy.maxAttempts;

  return {
    failedLoginAttempts,
    firstFailedLoginAt: inWindow ? new Date(first) : now,
    lastFailedLoginAt: now,
    lockUntil: locksNow ? new Date(now.getTime() + policy.lockMs) : null,
    allowed: failedLoginAttempts <= policy.maxAttempts,
    locksNow: failedLoginAttempts === policy.maxAttempts,
  };
}

// The state after a successful login: everything reset.
const RESET_STATE = Object.freeze({ failedLoginAttempts: 0, firstFailedLoginAt: null, lastFailedLoginAt: null, lockUntil: null });

/**
 * The same rules as claimAttempt, as a MongoDB filter + update pipeline,
 * so the read-modify-write happens atomically inside the database.
 * Missing fields (accounts created before this feature) count as empty.
 */
function claimAttemptUpdate(now, policy) {
  const windowStart = new Date(now.getTime() - policy.windowMs);
  const lockEnd = new Date(now.getTime() + policy.lockMs);

  const filter = { $or: [{ lockUntil: null }, { lockUntil: { $lte: now } }] };

  const inWindow = {
    $and: [
      { $eq: [{ $ifNull: ['$lockUntil', null] }, null] },
      { $gt: [{ $ifNull: ['$firstFailedLoginAt', new Date(0)] }, windowStart] },
    ],
  };

  const update = [
    {
      $set: {
        failedLoginAttempts: { $cond: [inWindow, { $add: [{ $ifNull: ['$failedLoginAttempts', 0] }, 1] }, 1] },
        firstFailedLoginAt: { $cond: [inWindow, '$firstFailedLoginAt', now] },
        lastFailedLoginAt: now,
      },
    },
    {
      $set: {
        lockUntil: { $cond: [{ $gte: ['$failedLoginAttempts', policy.maxAttempts] }, lockEnd, null] },
      },
    },
  ];

  return { filter, update };
}

module.exports = { isLocked, claimAttempt, claimAttemptUpdate, RESET_STATE };
