const logger = require('../utils/logger');

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
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
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
function errorHandler(err, req, res, next) {
  // Mongoose rejected the data (schema validation, bad cast, unknown field
  // under strict: 'throw'). That's bad input, not a server fault, but the
  // raw message names schema paths, so it's replaced with a generic one.
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(err.name)) {
    err = Object.assign(new AppError('Invalid input', 400), { stack: err.stack, cause: err.message });
  }

  // The body parser rejected the request before any route ran (bad JSON,
  // too large, unsupported encoding). Its own messages can quote the raw
  // body, so they're swapped for fixed ones.
  if (err.type && BODY_PARSER_MESSAGES[err.type]) {
    const [message, status] = BODY_PARSER_MESSAGES[err.type];
    err = Object.assign(new AppError(message, status), { stack: err.stack, cause: err.type });
  }

  // CORS refused a disallowed browser origin (see config/security.js).
  if (err.blockedOrigin) {
    logger.event('CORS', 'Blocked request from a disallowed origin', {
      origin: err.blockedOrigin,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    });
  }

  const statusCode = err.statusCode || 500;

  // Full details go to the server log only - never to the client.
  logger.error(err.message, {
    statusCode,
    path: req.originalUrl,
    method: req.method,
    cause: err.cause,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

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
