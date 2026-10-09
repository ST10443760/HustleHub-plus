/**
 * Starts the API with relaxed rate limits for the main Newman run, which
 * registers and logs in far more often than the strict limits allow.
 *
 * Only for local testing. It refuses to run with NODE_ENV=production, and
 * the API ignores these overrides in production anyway.
 *
 * Usage (from api/): npm run start:test
 */
const logger = require('../src/utils/logger');

const RELAXED_MAX = '10000';
const OVERRIDES = [
  'RATE_LIMIT_LOGIN_MAX',
  'RATE_LIMIT_REGISTER_MAX',
  'RATE_LIMIT_BOOKING_MAX',
  'RATE_LIMIT_GENERAL_MAX',
];

if (process.env.NODE_ENV === 'production') {
  logger.error('start:test refuses to run when NODE_ENV is production');
  process.exit(1);
}

// Set before the server loads .env - dotenv never overwrites a variable
// that's already set, so these win over anything in the file.
for (const key of OVERRIDES) {
  process.env[key] = RELAXED_MAX;
}
logger.warn('Starting with RELAXED rate limits - for local testing only');

require('../src/server');
