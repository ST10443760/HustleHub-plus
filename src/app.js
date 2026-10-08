const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const authenticateToken = require('./middleware/auth');

const app = express();


// ---- Security & parsing middleware pipeline ----
// Order matters here - keep helmet/cors first, body parsing next, then routes.

app.use(helmet()); // Sets secure HTTP headers
app.use(cors()); // Tighten this to a specific origin once the frontend exists

app.use(express.json({ limit: '10kb' })); // Parses JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));


// ---- Request logging ----
// Records incoming requests for debugging and monitoring.

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});


// ---- Routes ----

const authRoutes = require('./authRoutes');
const incomeRoutes = require('./incomeRoutes');

// Authentication routes
app.use('/api/auth', authRoutes);

// Income routes require a valid JWT
app.use('/api', authenticateToken, incomeRoutes);


// ---- Health check ----
// This endpoint confirms that the API is running.

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HustleHub+ API is running'
  });
});


// ---- Protected test route ----
// Used to verify that JWT authentication is working.

app.get('/api/protected', authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'You have accessed a protected route',
    user: req.user
  });
});


// ---- 404 + centralised error handling ----
// These must stay LAST, after every route is mounted.

app.use(notFoundHandler);
app.use(errorHandler);


module.exports = app;