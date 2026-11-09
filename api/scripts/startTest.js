/**
 * Starts the API with relaxed rate limits for the main Newman run, which
 * registers and logs in far more often than the strict limits allow.
 *
 * Only for local testing. It refuses to run with NODE_ENV=production, and
 * the API ignores these overrides in production anyway.
 *
 * Usage (from api/):
 *   npm run start:test          relaxed limits, for the main collection
 *   npm run start:test:strict   the real (strict) limits, for the rate
 *                               limit collection
 *
 * Both are test runs: cloud log shipping stays off (see below).
 */
const logger = require('../src/utils/logger');

const RELAXED_MAX = '10000';
const OVERRIDES = [
  'RATE_LIMIT_LOGIN_MAX',
  'RATE_LIMIT_REGISTER_MAX',
  'RATE_LIMIT_BOOKING_MAX',
  'RATE_LIMIT_PASSWORD_CHANGE_MAX',
  'RATE_LIMIT_GENERAL_MAX',
];

if (process.env.NODE_ENV === 'production') {
  logger.error('start:test refuses to run when NODE_ENV is production');
  process.exit(1);
}

const strict = process.argv.includes('--strict');

// Set before the server loads .env - dotenv never overwrites a variable
// that's already set, so these win over anything in the file.
if (strict) {
  logger.info('Starting with the STRICT rate limits - for the rate limit tests');
} else {
  for (const key of OVERRIDES) {
    // eslint-disable-next-line security/detect-object-injection -- key is one of the fixed OVERRIDES names above
    process.env[key] = RELAXED_MAX;
  }
  logger.warn('Starting with RELAXED rate limits - for local testing only');
}

// Marks this as a test run, so cloud log shipping stays OFF even though
// api/.env has the Axiom settings: the Newman runs must not fill the real
// dataset with test data. Set LOG_SHIPPING_IN_TEST=1 to ship anyway (for a
// demo of the lockout in the cloud logs).
process.env.HUSTLEHUB_TEST_RUN = '1';

require('../src/server');
