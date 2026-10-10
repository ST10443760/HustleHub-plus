/**
 * Generates the local self-signed certificate the API uses for HTTPS:
 * certs/key.pem and certs/cert.pem (valid for 365 days, CN=localhost).
 *
 * Works the same on Windows, macOS and Linux. OpenSSL is called directly
 * with an argument list (no shell), so Git Bash can't rewrite the
 * "/C=ZA/..." subject into a Windows path, and on Windows the OpenSSL that
 * ships with Git is used if openssl isn't on the PATH.
 *
 * Refuses to overwrite existing certs unless run with --force.
 *
 * Usage (from api/): npm run certs
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

const CERT_DIR = path.join(__dirname, '..', 'certs');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const CERT_PATH = path.join(CERT_DIR, 'cert.pem');
const SUBJECT = '/C=ZA/ST=Gauteng/L=Johannesburg/O=NullDevs/OU=INSY7314/CN=localhost';

// OpenSSL that ships with Git for Windows, for when it isn't on the PATH.
const WINDOWS_FALLBACKS = [
  'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
  'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe',
  'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
];

function findOpenssl() {
  const onPath = spawnSync('openssl', ['version'], { encoding: 'utf8' });
  if (onPath.status === 0) return 'openssl';
  if (process.platform === 'win32') {
    return WINDOWS_FALLBACKS.find((candidate) => fs.existsSync(candidate)) || null;
  }
  return null;
}

function main() {
  const force = process.argv.includes('--force');
  if (!force && fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
    logger.info('certs/key.pem and certs/cert.pem already exist - nothing to do (use --force to replace them)');
    return 0;
  }

  const openssl = findOpenssl();
  if (!openssl) {
    logger.error('OpenSSL not found. Install it (or Git for Windows, which includes it) and try again.');
    return 1;
  }

  fs.mkdirSync(CERT_DIR, { recursive: true });
  const result = spawnSync(
    openssl,
    ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', KEY_PATH, '-out', CERT_PATH, '-days', '365', '-nodes', '-subj', SUBJECT],
    { encoding: 'utf8' }
  );

  if (result.status !== 0 || !fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
    logger.error('OpenSSL could not create the certificate', { exitCode: result.status });
    return 1;
  }

  logger.info('Created certs/key.pem and certs/cert.pem (self-signed, CN=localhost, 365 days)');
  return 0;
}

process.exitCode = main();
