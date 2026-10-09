const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const sanitize = require('./middleware/sanitize');
const { helmetOptions, corsOptions } = require('./config/security');
const { generalLimiter } = require('./middleware/rateLimiters');
const logger = require('./utils/logger');

const app = express();

// Don't advertise the framework (Helmet removes the header too).
app.disable('x-powered-by');

// Lightweight request logger - not a replacement for the event-specific
// logging in each controller, just a trace of what hit the API. First, so
// requests blocked by CORS or a rate limiter still show up.
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ---- Security & parsing middleware pipeline ----
// Order matters here - keep helmet/cors first, body parsing next, then routes.
app.use(helmet(helmetOptions)); // strict CSP, HSTS, nosniff, no-referrer, cross-origin policies
app.use(cors(corsOptions)); // only CLIENT_ORIGIN, never a wildcard
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

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HustleHub+ API is running' });
});

// ---- 404 + centralised error handling ----
// These must stay LAST, after every route is mounted.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
