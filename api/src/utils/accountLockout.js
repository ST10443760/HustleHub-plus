const User = require('../models/User');
const { resolveLockoutPolicy } = require('../config/lockout');
const { claimAttemptUpdate, RESET_STATE } = require('./lockout');
const { comparePassword, DUMMY_HASH } = require('./password');
const { recordAudit } = require('./audit');
const logger = require('./logger');

const { policy: LOCKOUT_POLICY, ignoredOverrides } = resolveLockoutPolicy();

if (ignoredOverrides.length > 0) {
  logger.warn('Ignoring account lockout overrides in production', { ignored: ignoredOverrides });
}
logger.info('Account lockout active', {
  policy: `${LOCKOUT_POLICY.maxAttempts} failed attempts in ${LOCKOUT_POLICY.windowMs / 60000} min lock the account for ${LOCKOUT_POLICY.lockMs / 60000} min`,
});

// Spends the same bcrypt time as a real check, so a locked account or an
// unknown email can't be told apart from a wrong password by timing.
function burnPasswordCheck(password) {
  return comparePassword(typeof password === 'string' ? password : '', DUMMY_HASH);
}

/**
 * Checks `password` against `user` (loaded with +passwordHash) with the
 * account lockout applied. Used by login and by change-password, so a wrong
 * current password counts toward the lock as well.
 *
 * 1. Claims an attempt atomically (utils/lockout.js). If the account is
 *    locked, the real password is NOT checked: a dummy bcrypt compare runs
 *    instead and the result is a failure.
 * 2. Right password: the counters are reset.
 * 3. Wrong password on the attempt that reaches the limit: the account is
 *    now locked; logged (user id only) and written to the audit log.
 *
 * Resolves to true only for the right password on an unlocked account.
 */
async function verifyPassword(req, user, password, { now = new Date(), policy = LOCKOUT_POLICY } = {}) {
  const { filter, update } = claimAttemptUpdate(now, policy);
  const claimed = await User.findOneAndUpdate({ _id: user._id, ...filter }, update, {
    returnDocument: 'after',
    updatePipeline: true,
    projection: { failedLoginAttempts: 1, lockUntil: 1 },
  });

  if (!claimed || claimed.failedLoginAttempts > policy.maxAttempts) {
    await burnPasswordCheck(password);
    logger.event('AUTH', 'Attempt on a locked account - password not checked', { userId: user.id, ip: req.ip });
    return false;
  }

  if (await comparePassword(password, user.passwordHash)) {
    await User.updateOne({ _id: user._id }, { $set: RESET_STATE });
    return true;
  }

  if (claimed.failedLoginAttempts === policy.maxAttempts) {
    const lockMinutes = Math.round(policy.lockMs / 60000);
    logger.event('AUTH', 'Account locked after too many failed attempts', { userId: user.id, lockMinutes, ip: req.ip });
    await recordAudit(req, {
      actor: { id: user.id, role: user.role },
      action: 'account_locked',
      targetType: 'user',
      targetId: user._id,
      meta: { failedAttempts: claimed.failedLoginAttempts, lockMinutes },
    });
  }
  return false;
}

module.exports = { verifyPassword, burnPasswordCheck, LOCKOUT_POLICY };
