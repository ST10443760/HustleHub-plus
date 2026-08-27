const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');


const app = express();

// ---- Security & parsing middleware pipeline ----
// Order matters here - keep helmet/cors first, body parsing next, then routes.
app.use(helmet()); // sets secure HTTP headers
app.use(cors()); // tighten this to a specific origin once the frontend exists (Part 2)
app.use(express.json({ limit: '10kb' })); // body parser, with a sane size limit
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Lightweight request logger - not a replacement for the event-specific
// logging in each controller, just a trace of what hit the API.
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ---- Routes ----
// Each teammate's routes get mounted here as they're built, e.g:
// app.use('/api/auth', require('./routes/authRoutes'));
const authRoutes = require('./authRoutes');
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HustleHub+ API is running' });
});

// ---- 404 + centralised error handling ----
// These must stay LAST, after every route is mounted.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
