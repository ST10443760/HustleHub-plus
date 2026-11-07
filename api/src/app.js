const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const sanitize = require('./middleware/sanitize');
const { helmetOptions, corsOptions } = require('./config/security');
const { generalLimiter } = require('./middleware/rateLimiters');
const logger = require('./utils/logger');

const app = express();
const HEALTH_PATH = '/api/health';

// Don't advertise the framework (Helmet removes the header too).
app.disable('x-powered-by');

// Lightweight request logger - not a replacement for the event-specific
// logging in each controller, just a trace of what hit the API. First, so
// requests blocked by CORS or a rate limiter still show up.
// The health check is skipped: container healthchecks call it every few
// seconds and would bury the real traffic.
app.use((req, res, next) => {
  if (req.path !== HEALTH_PATH) logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

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
