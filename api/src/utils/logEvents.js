/**
 * The event catalogue: every name logger.event() is called with, and the
 * level it is logged at unless the call says otherwise. The names are
 * stable, because the saved queries and monitors in Axiom search for them
 * (see docs/logging-evidence/axiom-queries.md). Rename one and those break.
 */
const EVENTS = Object.freeze({
  // Authentication
  AUTH_REGISTER: 'info',
  AUTH_LOGIN_SUCCESS: 'info',
  AUTH_LOGIN_FAILURE: 'warn',
  AUTH_LOCKOUT: 'warn',
  AUTH_PASSWORD_CHANGED: 'info',
  AUTH_PASSWORD_CHANGE_FAILED: 'warn',
  AUTH_LOGOUT_ALL: 'info',

  // Access control and abuse
  ACCESS_DENIED: 'warn',
  RATE_LIMIT_EXCEEDED: 'warn',
  VALIDATION_FAILED: 'warn',
  INPUT_SANITIZED: 'warn',

  // Business events
  GIG_CREATED: 'info',
  GIG_UPDATED: 'info',
  GIG_DELETED: 'info',
  BOOKING_CREATED: 'info',
  BOOKING_FAILED: 'warn',
  TRANSACTION_CREATED: 'info',
  ADMIN_ACTION: 'info',

  // Failures and lifecycle
  AUDIT_WRITE_FAILED: 'error',
  ERROR_UNHANDLED: 'error',
  SERVER_START: 'info',
  SERVER_STOP: 'info',

  // Not events in the security sense, but every record has a name.
  HTTP_REQUEST: 'info', // the access log, one per request
  APP_LOG: 'info', // logger.info / warn / error
  LOG_TEST: 'info', // npm run log:test
});

const EVENT_NAMES = Object.freeze(Object.keys(EVENTS));
const LEVELS = new Map(Object.entries(EVENTS));

function defaultLevel(name) {
  return LEVELS.get(name) || 'info';
}

module.exports = { EVENTS, EVENT_NAMES, defaultLevel };
