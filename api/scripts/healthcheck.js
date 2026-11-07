/**
 * Container healthcheck: GET /api/health on this machine and exit 0 if it
 * answers 200, 1 otherwise. Used by the Dockerfile HEALTHCHECK.
 *
 * Talks HTTPS when the cert is there (as server.js does) and checks the
 * server certificate against that same self-signed cert, so verification
 * stays on. Falls back to HTTP only when there is no cert, like server.js.
 *
 * Usage: node scripts/healthcheck.js
 */
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const PORT = Number(process.env.PORT) || 5000;
const CERT_PATH = path.join(__dirname, '..', 'certs', 'cert.pem');
const TIMEOUT_MS = 4000;

const useHttps = fs.existsSync(CERT_PATH);
const client = useHttps ? https : http;
const options = {
  host: '127.0.0.1',
  port: PORT,
  path: '/api/health',
  timeout: TIMEOUT_MS,
  ...(useHttps ? { ca: fs.readFileSync(CERT_PATH), servername: 'localhost' } : {}),
};

const req = client.get(options, (res) => {
  res.resume();
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('timeout', () => req.destroy(new Error('timeout')));
req.on('error', () => process.exit(1));
