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
  const ignoredOverrides = [];

  const limits = Object.fromEntries(
    Object.entries(STRICT_LIMITS).map(([name, { windowMs, max, envKey }]) => {
      // eslint-disable-next-line security/detect-object-injection -- envKey is a fixed name from STRICT_LIMITS above, never from a request
      const raw = env[envKey];
      const override = Number.parseInt(raw, 10);
      const hasOverride = raw !== undefined && Number.isInteger(override) && override > 0;

      if (hasOverride && isProduction) ignoredOverrides.push(envKey);
      return [name, { windowMs, max: hasOverride && !isProduction ? override : max }];
    })
  );

  return { limits, ignoredOverrides };
}

module.exports = { STRICT_LIMITS, resolveRateLimits };
