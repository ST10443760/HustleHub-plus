const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const sanitize = require('./middleware/sanitize');
const { helmetOptions, corsOptions } = require('./config/security');
const { resolveTrustProxy } = require('./config/proxy');
const { generalLimiter } = require('./middleware/rateLimiters');
const { requestId, restoreContext, accessLog, HEALTH_PATH } = require('./middleware/requestLogging');

const app = express();

// Don't advertise the framework (Helmet removes the header too).
app.disable('x-powered-by');

// Off unless TRUST_PROXY is set (Docker sets it to 1 for nginx). Must be
// set before the rate limiters, which key on req.ip. See config/proxy.js.
app.set('trust proxy', resolveTrustProxy());

// Request id + access log, first, so requests blocked by CORS or a rate
// limiter are logged too. Every log line for a request carries its id,
// which is also returned in the X-Request-Id header. The access log is one
// line per request (method, path without the query string, status,
// duration, user); the health check and CORS preflights are skipped.
// See middleware/requestLogging.js.
app.use(requestId);
app.use(accessLog);

// ---- Security & parsing middleware pipeline ----
// Order matters here - keep helmet/cors first, body parsing next, then routes.
app.use(helmet(helmetOptions)); // strict CSP, HSTS, nosniff, no-referrer, cross-origin policies
app.use(cors(corsOptions)); // only CLIENT_ORIGIN, never a wildcard

// Health check for Docker and the pipeline. Registered BEFORE the rate
// limiters, so healthchecks polling it can never use up anyone's limit.
// Says nothing about the server beyond "up" - no version, uptime or DB info.
app.get(HEALTH_PATH, (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.use('/api', generalLimiter); // safety net, before any body is parsed
app.use(express.json({ limit: '10kb' })); // body parser, with a sane size limit
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(restoreContext); // the body parsers can drop the logging context, so put it back
app.use(sanitize); // strips $ / . keys from body, query and params - must come after parsing

// ---- Routes ----
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/gigs', require('./routes/gigRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/income', require('./routes/incomeRoutes'));

// ---- 404 + centralised error handling ----
// These must stay LAST, after every route is mounted.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
