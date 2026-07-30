/**
 * Shared logging utility.
 *
 * Everyone's routes/controllers should use this instead of raw console.log,
 * so log output stays consistent and we have one place to upgrade to a
 * proper logging library (e.g. Winston) or cloud logging platform later
 * (that's a Part 3 requirement, so keep this in mind).
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('User registered', { userId: user.id });
 *   logger.warn('Failed login attempt', { email });
 *   logger.error('Unhandled error', { error: err.message });
 */

function timestamp() {
  return new Date().toISOString();
}

function format(level, message, meta) {
  const base = `[${timestamp()}] [${level}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

const logger = {
  info(message, meta = {}) {
    console.log(format('INFO', message, meta));
  },
  warn(message, meta = {}) {
    console.warn(format('WARN', message, meta));
  },
  error(message, meta = {}) {
    console.error(format('ERROR', message, meta));
  },
  // Convenience helper for the security-relevant events the rubric
  // specifically asks us to track: logins, bookings, transactions, errors.
  event(eventType, message, meta = {}) {
    console.log(format(`EVENT:${eventType}`, message, meta));
  },
};

module.exports = logger;
