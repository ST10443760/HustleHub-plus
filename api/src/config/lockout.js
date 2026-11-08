/**
 * Account lockout policy: 5 failed password attempts within 15 minutes
 * lock the account for 15 minutes. Failures older than the window don't
 * count, and a successful login resets everything.
 *
 * This guards ONE account against slow guessing from MANY IP addresses,
 * which the per-IP login rate limiter can't see. The two layers work
 * together; see "Account lockout" in the README.
 *
 * Like the rate limits, the values can be changed with env variables for
 * local testing only. Overrides are IGNORED when NODE_ENV is production.
 */
const MINUTE = 60 * 1000;

const STRICT_LOCKOUT = Object.freeze({
  maxAttempts: 5,
  windowMs: 15 * MINUTE,
  lockMs: 15 * MINUTE,
});

const OVERRIDES = [
  ['maxAttempts', 'LOCKOUT_MAX_ATTEMPTS', 1],
  ['windowMs', 'LOCKOUT_WINDOW_MINUTES', MINUTE],
  ['lockMs', 'LOCKOUT_DURATION_MINUTES', MINUTE],
];

function resolveLockoutPolicy(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const policy = { ...STRICT_LOCKOUT };
  const ignoredOverrides = [];
  const vars = new Map(Object.entries(env));

  for (const [field, envKey, unit] of OVERRIDES) {
    const raw = vars.get(envKey);
    if (raw === undefined) continue;
    const value = Number.parseInt(raw, 10);
    if (!Number.isInteger(value) || value <= 0 || String(value) !== String(raw).trim()) continue;
    if (isProduction) {
      ignoredOverrides.push(envKey);
      continue;
    }
    Object.assign(policy, { [field]: value * unit });
  }

  return { policy: Object.freeze(policy), ignoredOverrides };
}

module.exports = { STRICT_LOCKOUT, resolveLockoutPolicy };
