require('dotenv').config();
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const logger = require('./utils/logger');
const { validateEnv } = require('./config/env');

// Fail fast, before loading the app or touching the database, if a
// required setting is missing.
const envProblems = validateEnv();
if (envProblems.length > 0) {
  envProblems.forEach((problem) => logger.error(`Startup aborted: ${problem}`));
  process.exit(1);
}

// Cloud logging (Axiom) when LOG_SHIPPING_URL and LOG_SHIPPING_TOKEN are
// set, and never in a test run unless LOG_SHIPPING_IN_TEST=1. Turned on
// before anything else logs, so startup is shipped too.
const shipping = logger.enableShipping();
const SHUTDOWN_FLUSH_MS = 2000;

// Last-resort handlers: log the failure (name and message only), send what
// is queued, and for an uncaught exception exit non-zero, because the
// process is in an unknown state. A stray rejected promise is logged and
// the server keeps running.
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.event('ERROR_UNHANDLED', 'Unhandled promise rejection', { source: 'unhandledRejection', errorName: err.name, errorMessage: err.message });
  logger.flush(SHUTDOWN_FLUSH_MS);
});

process.on('uncaughtException', (err) => {
  logger.event('ERROR_UNHANDLED', 'Uncaught exception - shutting down', {
    source: 'uncaughtException',
    errorName: err && err.name,
    errorMessage: err && err.message,
  });
  logger.flush(SHUTDOWN_FLUSH_MS).finally(() => process.exit(1));
});

// Docker stop / Ctrl+C: send the queued logs (at most 2 s), then exit.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    logger.event('SERVER_STOP', `Received ${signal} - shutting down`, { signal });
    logger.flush(SHUTDOWN_FLUSH_MS).finally(() => process.exit(0));
  });
}

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

function logStart(protocol) {
  logger.event('SERVER_START', `HustleHub+ API listening on ${protocol}://localhost:${PORT}`, {
    port: Number(PORT),
    protocol,
    nodeEnv: process.env.NODE_ENV || 'development',
    logFormat: logger.resolveFormat(),
    cloudLogging: shipping.enabled ? 'on' : `off - ${shipping.reason}`,
  });
}
const KEY_PATH = path.join(__dirname, '..', 'certs', 'key.pem');
const CERT_PATH = path.join(__dirname, '..', 'certs', 'cert.pem');

function startServer() {
  const certsExist = fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH);

  if (certsExist) {
    const options = {
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH),
    };
    https.createServer(options, app).listen(PORT, () => logStart('https'));
  } else {
    // Fallback so the app still runs (e.g. teammates who haven't generated
    // certs locally yet) - but this is NOT the required setup, only a
    // convenience so npm run dev doesn't hard-crash. See certs/README.md
    // for how to generate your own local cert.
    logger.warn(
      'No SSL certificate found in api/certs - falling back to plain HTTP. The client proxy and the Postman ' +
        'collections expect HTTPS and will fail. Run "npm run certs" and restart. See certs/README.md.'
    );
    http.createServer(app).listen(PORT, () => logStart('http'));
  }
}

// Only start accepting requests once the database is reachable - there's
// no point serving auth routes that can't read or write users.
connectDB()
  .then(startServer)
  .catch(() => {
    logger.error('Could not connect to the database - shutting down');
    logger.flush(SHUTDOWN_FLUSH_MS).finally(() => process.exit(1));
  });
