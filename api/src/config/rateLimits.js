/**
 * Rate limit settings.
 *
 * The strict values below are the real limits. For local testing the max
 * of each limiter can be raised with an env variable (the main Newman run
 * registers and logs in far more often than a real user would), but those
 * overrides are IGNORED when NODE_ENV is production, so the strict values
 * can't be relaxed in a deployed API by mistake.
 */
const MINUTE = 60 * 1000;

const STRICT_LIMITS = {
  // Failed logins only - successful ones don't count.
  login: { windowMs: 15 * MINUTE, max: 5, envKey: 'RATE_LIMIT_LOGIN_MAX' },
  register: { windowMs: 60 * MINUTE, max: 10, envKey: 'RATE_LIMIT_REGISTER_MAX' },
  // Per authenticated user, not per IP.
  booking: { windowMs: 10 * MINUTE, max: 10, envKey: 'RATE_LIMIT_BOOKING_MAX' },
  // Safety net across the whole API.
  general: { windowMs: 15 * MINUTE, max: 100, envKey: 'RATE_LIMIT_GENERAL_MAX' },
};

function resolveRateLimits(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const limits = {};
  const ignoredOverrides = [];

  for (const [name, { windowMs, max, envKey }] of Object.entries(STRICT_LIMITS)) {
    const override = Number.parseInt(env[envKey], 10);
    const hasOverride = env[envKey] !== undefined && Number.isInteger(override) && override > 0;

    if (hasOverride && isProduction) ignoredOverrides.push(envKey);
    limits[name] = { windowMs, max: hasOverride && !isProduction ? override : max };
  }

  return { limits, ignoredOverrides };
}

module.exports = { STRICT_LIMITS, resolveRateLimits };
