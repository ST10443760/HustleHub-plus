require('dotenv').config();
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const KEY_PATH = path.join(__dirname, '..', 'certs', 'key.pem');
const CERT_PATH = path.join(__dirname, '..', 'certs', 'cert.pem');

function startServer() {
  const certsExist = fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH);

  if (certsExist) {
    const options = {
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH),
    };
    https.createServer(options, app).listen(PORT, () => {
      logger.info(`HustleHub+ API listening on https://localhost:${PORT}`);
    });
  } else {
    // Fallback so the app still runs (e.g. teammates who haven't generated
    // certs locally yet) - but this is NOT the required setup, only a
    // convenience so npm run dev doesn't hard-crash. See certs/README.md
    // for how to generate your own local cert.
    logger.warn('No SSL certificate found in /certs - falling back to plain HTTP. See certs/README.md.');
    http.createServer(app).listen(PORT, () => {
      logger.info(`HustleHub+ API listening on http://localhost:${PORT} (HTTPS NOT active)`);
    });
  }
}

// Only start accepting requests once the database is reachable - there's
// no point serving auth routes that can't read or write users.
connectDB()
  .then(startServer)
  .catch(() => {
    logger.error('Could not connect to the database - shutting down');
    process.exit(1);
  });
