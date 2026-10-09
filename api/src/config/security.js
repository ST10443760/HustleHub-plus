const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

const DEV_CLIENT_ORIGIN = 'http://localhost:5173';

/**
 * The one browser origin allowed to call the API. Read from CLIENT_ORIGIN;
 * in development it falls back to the Vite dev server, in production it
 * must be set explicitly.
 */
function resolveClientOrigin(env = process.env) {
  const value = (env.CLIENT_ORIGIN || '').trim();

  if (!value) {
    if (env.NODE_ENV === 'production') {
      throw new Error('CLIENT_ORIGIN must be set in production');
    }
    logger.warn(`CLIENT_ORIGIN not set - defaulting to ${DEV_CLIENT_ORIGIN}`);
    return DEV_CLIENT_ORIGIN;
  }

  // Must be a bare origin (scheme + host + optional port), exactly as a
  // browser sends it in the Origin header - no path, no trailing slash.
  const parsed = new URL(value);
  if (parsed.origin !== value) {
    throw new Error('CLIENT_ORIGIN must be an origin like http://localhost:5173 (no path or trailing slash)');
  }
  return value;
}

const CLIENT_ORIGIN = resolveClientOrigin();

/**
 * Helmet, configured explicitly for a JSON API. The CSP is built from
 * scratch (useDefaults: false) so nothing loosens it - no 'unsafe-inline'
 * or 'unsafe-eval' anywhere. The React client gets its own CSP.
 */
const helmetOptions = {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", CLIENT_ORIGIN],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  // 1 year, subdomains included. Browsers only honour this over HTTPS.
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
  xContentTypeOptions: true, // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  xFrameOptions: { action: 'deny' }, // older browsers that ignore frame-ancestors
  xPoweredBy: false, // removes X-Powered-By
};

/**
 * CORS locked to the client origin. Requests with no Origin header (curl,
 * Postman, server-to-server) aren't browser cross-origin requests, so CORS
 * doesn't apply and they're let through. Any other origin is refused with
 * a generic 403 - no Access-Control-Allow-Origin header is ever sent for
 * it, and preflights from it fail the same way.
 */
const corsOptions = {
  origin(origin, callback) {
    if (!origin || origin === CLIENT_ORIGIN) {
      return callback(null, true);
    }
    const err = new AppError('Origin not allowed', 403);
    err.blockedOrigin = origin;
    return callback(err);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: false, // the JWT travels in the Authorization header, not a cookie
  maxAge: 600, // browsers may cache a successful preflight for 10 minutes
  optionsSuccessStatus: 204,
};

module.exports = { CLIENT_ORIGIN, helmetOptions, corsOptions, resolveClientOrigin };
