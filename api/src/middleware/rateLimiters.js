const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { resolveRateLimits } = require('../config/rateLimits');
const logger = require('../utils/logger');

/**
 * Rate limiters for sensitive endpoints, plus a general safety net.
 * Limits come from config/rateLimits.js (strict by default, never relaxed
 * in production).
 *
 * Every limiter answers with 429, the standard error shape, a Retry-After
 * header and the standard RateLimit headers (legacy X-RateLimit-* off).
 * Each hit is logged with the limiter name and IP - nothing from the
 * request body, so no passwords or tokens end up in the log.
 */
const { limits, ignoredOverrides } = resolveRateLimits();

if (ignoredOverrides.length > 0) {
  logger.warn('Ignoring rate limit overrides in production', { ignored: ignoredOverrides });
}
logger.info('Rate limits active', {
  login: `${limits.login.max} failed / 15 min per IP`,
  register: `${limits.register.max} / hour per IP`,
  booking: `${limits.booking.max} / 10 min per user`,
  general: `${limits.general.max} / 15 min per IP`,
});

function secondsUntilReset(req, res) {
  const header = Number.parseInt(res.getHeader('Retry-After'), 10);
  if (Number.isInteger(header) && header > 0) return header;
  const resetTime = req.rateLimit && req.rateLimit.resetTime;
  return resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : 60;
}

function createLimiter(name, { windowMs, max }, extra = {}) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      const seconds = secondsUntilReset(req, res);
      res.set('Retry-After', String(seconds));

      logger.event('RATE_LIMIT', 'Rate limit hit', {
        limiter: name,
        ip: req.ip,
        userId: req.user ? req.user.id : undefined,
        method: req.method,
        path: req.originalUrl,
      });

      res.status(429).json({
        success: false,
        error: `Too many requests, please try again in ${seconds} seconds.`,
      });
    },
    ...extra,
  });
}

// Only failed logins count: a successful login (status < 400) is taken
// back off the counter, so a real user who types their password right
// isn't locked out.
const loginLimiter = createLimiter('login', limits.login, { skipSuccessfulRequests: true });

const registerLimiter = createLimiter('register', limits.register);

// Keyed by the authenticated user, so clients sharing one IP (an office,
// a campus network) each get their own allowance. Must be mounted after
// `protect`. Falls back to the IP if there's no user.
const bookingLimiter = createLimiter('booking', limits.booking, {
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip)}`),
});

const generalLimiter = createLimiter('general', limits.general);

module.exports = { loginLimiter, registerLimiter, bookingLimiter, generalLimiter };
