const logger = require('../utils/logger');
const { routeOf } = require('../utils/requestContext');

/**
 * Custom error class so controllers can throw errors with a specific
 * HTTP status code attached, e.g:
 *   throw new AppError('Email already registered', 409);
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes "expected" errors from bugs
  }
}

// body-parser error types -> [safe message, status].
const BODY_PARSER_MESSAGES = {
  'entity.parse.failed': ['Request body is not valid JSON', 400],
  'entity.too.large': ['Request body is too large', 413],
  'entity.verify.failed': ['Request body could not be read', 400],
  'request.aborted': ['Request was aborted', 400],
  'request.size.invalid': ['Request body could not be read', 400],
  'stream.encoding.set': ['Request body could not be read', 400],
  'charset.unsupported': ['Unsupported character set', 415],
  'encoding.unsupported': ['Unsupported content encoding', 415],
  'parameters.too.many': ['Too many parameters in request body', 413],
};

/**
 * 404 handler - for any route that doesn't match.
 * Must be registered AFTER all real routes, BEFORE the error handler.
 */
function notFoundHandler(req, res, next) {
  // req.path, not originalUrl: the query string is never echoed back.
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
}

/**
 * Centralised error handler - must be the LAST middleware registered.
 *
 * Rubric requirement: error responses must never expose stack traces,
 * file paths, or config values. This is the one place that formats every
 * error response, so nobody accidentally leaks internals from inside a
 * controller.
 *
 * Validation-specific error shaping (e.g. field-level messages from
 * express-validator) plugs in here too - Lihle extends this file with
 * that logic rather than creating a second error handler.
 */
// Express only treats a middleware as an error handler when it takes exactly
// four arguments, so `next` must stay even though it is never called.
// eslint-disable-next-line no-unused-vars -- required 4-argument signature
function errorHandler(err, req, res, next) {
  // Mongoose rejected the data (schema validation, bad cast, unknown field
  // under strict: 'throw'). That's bad input, not a server fault, but the
  // raw message names schema paths, so it's replaced with a generic one.
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(err.name)) {
    logger.event('VALIDATION_FAILED', 'Request failed schema validation', { source: 'schema', errorName: err.name });
    err = Object.assign(new AppError('Invalid input', 400), { cause: err.name });
  }

  // The body parser rejected the request before any route ran (bad JSON,
  // too large, unsupported encoding). Its own messages can quote the raw
  // body, so they're swapped for fixed ones.
  if (err.type && BODY_PARSER_MESSAGES[err.type]) {
    const [message, status] = BODY_PARSER_MESSAGES[err.type];
    logger.event('VALIDATION_FAILED', 'Request body rejected', { source: 'body_parser', reason: err.type });
    err = Object.assign(new AppError(message, status), { cause: err.type });
  }

  // CORS refused a disallowed browser origin (see config/security.js).
  if (err.blockedOrigin) {
    logger.event('ACCESS_DENIED', 'Blocked request from a disallowed origin', {
      reason: 'cors_origin',
      status: err.statusCode || 403,
      origin: err.blockedOrigin,
      route: routeOf(req),
    });
  }

  const statusCode = err.statusCode || 500;

  // Details go to the server log only - never to the client. Server faults
  // are logged as ERROR_UNHANDLED with the error's name, message and status
  // only: no stack trace, no file paths. Expected errors (bad input,
  // 401/403/404/409) are a warning; the events above and in the
  // middleware already say why.
  if (statusCode >= 500) {
    logger.event('ERROR_UNHANDLED', 'Request failed with a server error', {
      errorName: err.name,
      errorMessage: err.message,
      status: statusCode,
    });
  } else {
    logger.warn(err.message, { status: statusCode, cause: err.cause });
  }

  const safeMessage =
    err.isOperational && err.message
      ? err.message
      : 'Something went wrong. Please try again later.';

  res.status(statusCode).json({
    success: false,
    error: safeMessage,
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };
