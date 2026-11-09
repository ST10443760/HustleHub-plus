const { randomUUID } = require('node:crypto');
const { runWithContext } = require('../utils/requestContext');
const logger = require('../utils/logger');

const HEALTH_PATH = '/api/health';

/**
 * Gives every request a server-generated id (crypto.randomUUID), returns it
 * in the X-Request-Id response header and starts the logging context, so
 * every log line written while handling the request carries the same id.
 * An X-Request-Id sent BY the client is ignored: a caller could otherwise
 * make its requests look like someone else's in the logs. Response bodies
 * are not changed.
 *
 * Must be the first middleware.
 */
function requestId(req, res, next) {
  const context = {
    requestId: randomUUID(),
    ip: req.ip,
    method: req.method,
    path: req.path, // never the query string
  };
  req.logContext = context;
  res.setHeader('X-Request-Id', context.requestId);
  runWithContext(context, next);
}

/**
 * Re-enters the request's logging context. The body parsers finish on
 * stream events, which can run outside the context that started the
 * request, so this goes straight after them.
 */
function restoreContext(req, res, next) {
  if (req.logContext) runWithContext(req.logContext, next);
  else next();
}

/**
 * The access log: one line per request when the response is done. Method,
 * path (no query string), status, duration and, once `protect` has run,
 * the user id and role. Never headers or bodies. 5xx are logged as errors,
 * 4xx as warnings. Skips the health check (container healthchecks call it
 * every few seconds) and CORS preflights.
 */
function accessLog(req, res, next) {
  if (req.method === 'OPTIONS' || req.path === HEALTH_PATH || !req.logContext) return next();

  const context = req.logContext;
  const started = process.hrtime.bigint();
  let logged = false;

  const done = () => {
    if (logged) return;
    logged = true;
    const durationMs = Math.round(Number(process.hrtime.bigint() - started) / 1e4) / 100;
    logger.access(context, { status: res.statusCode, durationMs, aborted: !res.writableFinished });
  };

  res.once('finish', done);
  res.once('close', done);
  next();
}

module.exports = { requestId, restoreContext, accessLog, HEALTH_PATH };
