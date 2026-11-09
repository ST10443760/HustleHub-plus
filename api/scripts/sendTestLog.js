/**
 * Sends ONE clearly labelled test event to the cloud logging service in
 * api/.env (LOG_SHIPPING_URL + LOG_SHIPPING_TOKEN), to check the connection.
 *
 * Usage (from api/): npm run log:test
 *
 * Prints only the HTTP status and the service's ingested / failed counts.
 * Never prints the URL or the token. Exits 1 when the event was not
 * accepted.
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const logger = require('../src/utils/logger');
const { resolveShippingConfig, describeStatus, toEvent } = require('../src/utils/logShipper');

const TIMEOUT_MS = 10000;

async function main() {
  // An explicit, manual check: allowed even from a test shell.
  const config = resolveShippingConfig({ ...process.env, NODE_ENV: 'development', HUSTLEHUB_TEST_RUN: '', NODE_TEST_CONTEXT: '' });
  if (!config.enabled) {
    logger.error(`log:test - cloud logging is off: ${config.reason}`);
    return 1;
  }

  const { record } = logger.buildRecord('info', 'LOG_TEST', 'HustleHub+ log:test connection check - safe to ignore', {
    source: 'npm run log:test',
    test: true,
  });

  let res;
  try {
    res = await fetch(config.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([toEvent(record)]),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    logger.error(`log:test - ${describeStatus(0, (err.cause && err.cause.code) || err.name)}`);
    return 1;
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const ingested = body && Number.isInteger(body.ingested) ? body.ingested : 'n/a';
  const failed = body && Number.isInteger(body.failed) ? body.failed : 'n/a';

  if (!res.ok) {
    logger.error(`log:test - ${describeStatus(res.status)}`);
    return 1;
  }
  logger.info(`log:test - HTTP ${res.status}, ingested: ${ingested}, failed: ${failed}`);
  return res.status === 200 && ingested === 1 && failed === 0 ? 0 : 1;
}

main().then((code) => {
  process.exitCode = code;
});
