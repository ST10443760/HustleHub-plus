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
  const statusCode = err.statusCode || 500;

  // Full details go to the server log only - never to the client.
  logger.error(err.message, {
    statusCode,
    path: req.originalUrl,
    method: req.method,
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
