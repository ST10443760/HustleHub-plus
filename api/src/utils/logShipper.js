const { scrub } = require('./redact');

/**
 * Ships log records to a cloud logging service (Axiom's ingest API) in the
 * background. No dependencies: Node's built-in fetch.
 *
 *   POST <LOG_SHIPPING_URL>            e.g. https://<edge>/v1/ingest/<dataset>
 *   Authorization: Bearer <LOG_SHIPPING_TOKEN>
 *   Content-Type: application/json
 *   [ { "_time": "...", "level": "...", "event": "...", ... }, ... ]
 *
 * - Off unless both settings are set. Off in tests and `npm run start:test`
 *   unless LOG_SHIPPING_IN_TEST=1, so test runs never fill the real dataset.
 * - Batches: sends every 5 s, or as soon as 100 records are waiting, at most
 *   500 per request, with a 5 s timeout per request.
 * - Retries network errors, timeouts, 5xx and 429 with capped exponential
 *   backoff (3 tries in all). Never retries other 4xx (a bad token or a
 *   missing dataset won't fix itself).
 * - Holds at most 1000 records. When full, the OLDEST are dropped and
 *   counted, so a long outage costs memory once, not forever.
 * - Never blocks or fails a request: enqueue is synchronous and cheap, and
 *   sending happens on timers that don't keep the process alive.
 * - Its own problems go to `onProblem` (the console only, at most once a
 *   minute) and never into the queue, so a failing shipper can't feed
 *   itself. Problem messages never include the URL or the token.
 */

const DEFAULTS = Object.freeze({
  flushIntervalMs: 5000,
  flushAt: 100,
  maxBatch: 500,
  requestTimeoutMs: 5000,
  maxTries: 3,
  backoffBaseMs: 500,
  backoffMaxMs: 4000,
  maxQueue: 1000,
  problemIntervalMs: 60000,
});

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function isTestRun(env) {
  return env.NODE_ENV === 'test' || env.HUSTLEHUB_TEST_RUN === '1' || Boolean(env.NODE_TEST_CONTEXT);
}

/**
 * Decides whether shipping is on. Returns { enabled, reason, url, token }.
 * `reason` explains why it is off, and never contains the URL or token.
 */
function resolveShippingConfig(env = process.env) {
  const url = typeof env.LOG_SHIPPING_URL === 'string' ? env.LOG_SHIPPING_URL.trim() : '';
  const token = typeof env.LOG_SHIPPING_TOKEN === 'string' ? env.LOG_SHIPPING_TOKEN.trim() : '';
  const off = (reason) => ({ enabled: false, reason });

  if (!url || !token) return off('not configured (LOG_SHIPPING_URL and LOG_SHIPPING_TOKEN are not both set)');
  if (isTestRun(env) && env.LOG_SHIPPING_IN_TEST !== '1') {
    return off('test run (set LOG_SHIPPING_IN_TEST=1 to ship anyway)');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return off('LOG_SHIPPING_URL is not a valid URL');
  }
  if (parsed.username || parsed.password) return off('LOG_SHIPPING_URL must not contain credentials');

  const httpAllowed = env.NODE_ENV === 'test' && LOOPBACK_HOSTS.has(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && httpAllowed)) {
    return off('LOG_SHIPPING_URL must use https');
  }

  return { enabled: true, reason: null, url: parsed.toString(), token };
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms).unref());
}

function describeStatus(status, errorName) {
  if (status === 0) return `could not reach the logging service (${errorName || 'network error'})`;
  if (status === 401 || status === 403) return `HTTP ${status}: the token is wrong or cannot ingest into this dataset`;
  if (status === 404) return 'HTTP 404: the dataset or the domain in LOG_SHIPPING_URL is wrong';
  if (status === 429 || status === 430) return `HTTP ${status}: the logging service's rate or ingest limit was reached`;
  return `HTTP ${status} from the logging service`;
}

function asCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

// One record in Axiom's shape: the time goes in _time.
function toEvent(record) {
  const clean = scrub(record);
  if (!clean || typeof clean !== 'object' || Array.isArray(clean)) return { _time: new Date().toISOString(), message: String(clean) };
  const { timestamp, ...rest } = clean;
  return { _time: typeof timestamp === 'string' ? timestamp : new Date().toISOString(), ...rest };
}

function createShipper({ url, token, fetchImpl = globalThis.fetch, onProblem = () => {}, sleep = defaultSleep, now = Date.now, ...options }) {
  const cfg = { ...DEFAULTS, ...options };
  const queue = [];
  const stats = { requests: 0, sent: 0, ingested: 0, failed: 0, dropped: 0, lost: 0, retries: 0, lastStatus: null };
  let inFlight = null;
  let timer = null;
  let lastProblemAt = -Infinity;
  let suppressed = 0;

  function problem(message) {
    const at = now();
    if (at - lastProblemAt < cfg.problemIntervalMs) {
      suppressed += 1;
      return;
    }
    lastProblemAt = at;
    const extra = suppressed > 0 ? ` (${suppressed} more problem(s) since the last report)` : '';
    suppressed = 0;
    try {
      onProblem(`Cloud log shipping: ${message}${extra}`);
    } catch {
      // a broken reporter must never break the shipper
    }
  }

  async function postOnce(batch) {
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(cfg.requestTimeoutMs),
      });
      stats.requests += 1;
      stats.lastStatus = res.status;
      let body = null;
      try {
        body = res.ok ? await res.json() : (await res.text(), null);
      } catch {
        body = null;
      }
      return { status: res.status, ok: res.ok, body };
    } catch (err) {
      stats.lastStatus = 0;
      return { status: 0, ok: false, errorName: (err && err.cause && err.cause.code) || (err && err.name) };
    }
  }

  async function sendBatch(batch) {
    for (let attempt = 1; attempt <= cfg.maxTries; attempt += 1) {
      const result = await postOnce(batch);
      if (result.ok) {
        const ingested = asCount(result.body && result.body.ingested);
        const failed = asCount(result.body && result.body.failed);
        stats.sent += batch.length;
        stats.ingested += ingested;
        stats.failed += failed;
        if (failed > 0) problem(`the logging service rejected ${failed} of ${batch.length} record(s)`);
        return true;
      }

      const retryable = result.status === 0 || result.status === 429 || result.status >= 500;
      if (!retryable || attempt === cfg.maxTries) {
        stats.lost += batch.length;
        problem(`${describeStatus(result.status, result.errorName)}; ${batch.length} record(s) not sent`);
        return false;
      }
      stats.retries += 1;
      await sleep(Math.min(cfg.backoffMaxMs, cfg.backoffBaseMs * 2 ** (attempt - 1)));
    }
    return false;
  }

  /** Sends everything waiting. Concurrent calls share one run. Never rejects. */
  function flush() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        while (queue.length > 0) {
          await sendBatch(queue.splice(0, cfg.maxBatch));
        }
      } catch {
        problem('unexpected shipper error');
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  /** Queues one record. Synchronous, never throws, never blocks. */
  function enqueue(record) {
    try {
      queue.push(toEvent(record));
      if (queue.length > cfg.maxQueue) {
        const extra = queue.length - cfg.maxQueue;
        queue.splice(0, extra);
        stats.dropped += extra;
        problem(`queue full, dropped the ${extra} oldest record(s)`);
      }
      if (queue.length >= cfg.flushAt) flush();
    } catch {
      stats.dropped += 1;
    }
  }

  function start() {
    if (!timer) {
      timer = setInterval(flush, cfg.flushIntervalMs);
      timer.unref();
    }
  }

  /** Stops the timer and sends what is left, giving up after `deadlineMs`. */
  async function close(deadlineMs = 2000) {
    if (timer) clearInterval(timer);
    timer = null;
    let deadline;
    await Promise.race([flush(), new Promise((resolve) => (deadline = setTimeout(resolve, deadlineMs)))]);
    clearTimeout(deadline);
    return getStats();
  }

  function getStats() {
    return { ...stats, queued: queue.length };
  }

  return { enqueue, flush, start, close, getStats };
}

module.exports = { createShipper, resolveShippingConfig, isTestRun, describeStatus, toEvent, DEFAULTS };
