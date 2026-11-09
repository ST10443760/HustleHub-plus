/**
 * Shared logger. Every log line in the API goes through here; nothing calls
 * console.log directly.
 *
 *   logger.info('MongoDB connected');
 *   logger.event('AUTH_LOGIN_FAILURE', 'Failed login', { reason: 'bad_credentials', email });
 *
 * Each call builds one structured record:
 *
 *   timestamp, level, event, message, service, env,
 *   requestId, userId, role, ip, method, path   (from the request context)
 *   ...the event's own fields                    (always scrubbed)
 *
 * The record is scrubbed (utils/redact.js), printed, and handed to the cloud
 * shipper when shipping is on (utils/logShipper.js).
 *
 * LOG_FORMAT picks the console format: "pretty" (the readable one-line
 * style, the default in development) or "json" (one JSON record per line,
 * the default when NODE_ENV=production and in Docker).
 *
 * Event names come from the catalogue in utils/logEvents.js.
 */
const { scrub, scrubString } = require('./redact');
const { getContext } = require('./requestContext');
const { defaultLevel } = require('./logEvents');
const { createShipper, resolveShippingConfig } = require('./logShipper');

const SERVICE = 'hustlehub-api';
const MAX_MESSAGE = 1024;
const MAX_RECORD_BYTES = 16 * 1024;
// Callers can't overwrite these with their own fields.
const PROTECTED_FIELDS = new Set(['timestamp', 'level', 'event', 'message', 'service', 'env']);
const LEVELS = new Set(['info', 'warn', 'error']);

let shipper = null;

function resolveFormat(env = process.env) {
  const format = typeof env.LOG_FORMAT === 'string' ? env.LOG_FORMAT.trim().toLowerCase() : '';
  if (format === 'json' || format === 'pretty') return format;
  return env.NODE_ENV === 'production' ? 'json' : 'pretty';
}

// "jane.doe@example.com" -> "j***@example.com": enough to spot a pattern
// in the logs without storing the full address of everyone who mistypes.
function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return '[invalid]';
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}***@${domain}`;
}

// The request fields every record carries when there is a request.
function pickContext(context) {
  if (!context) return {};
  const { requestId, userId, role, ip, method, path } = context;
  return Object.fromEntries(
    Object.entries({ requestId, userId, role, ip, method, path }).filter(([, value]) => value !== undefined && value !== null)
  );
}

/**
 * Builds one scrubbed record. `context` defaults to the current request's
 * (the access log passes its own, because a response can finish outside it).
 */
function buildRecord(level, event, message, meta, context = getContext()) {
  const cleanMeta = scrub(meta && typeof meta === 'object' ? meta : {});
  const fields = [
    ['timestamp', new Date().toISOString()],
    ['level', LEVELS.has(level) ? level : 'info'],
    ['event', scrubString(String(event), 64)],
    ['message', scrubString(String(message), MAX_MESSAGE)],
    ['service', SERVICE],
    ['env', process.env.NODE_ENV || 'development'],
    ...Object.entries(scrub(pickContext(context))),
  ];
  const own = Object.entries(cleanMeta && typeof cleanMeta === 'object' ? cleanMeta : {}).filter(([key]) => !PROTECTED_FIELDS.has(key));
  const record = Object.fromEntries([...fields, ...own]);

  // Size cap: a record too big to be useful keeps its headline fields only.
  if (Buffer.byteLength(JSON.stringify(record)) > MAX_RECORD_BYTES) {
    return { record: { ...Object.fromEntries(fields), truncated: true }, meta: { truncated: true } };
  }
  return { record, meta: Object.fromEntries(own) };
}

function prettyLine(record, meta) {
  const label = record.event === 'APP_LOG' || record.event === 'HTTP_REQUEST' ? record.level.toUpperCase() : `EVENT:${record.event}`;
  const shown = record.event === 'HTTP_REQUEST' ? {} : meta;
  let line = `[${record.timestamp}] [${label}] ${record.message}`;
  if (Object.keys(shown).length > 0) line += ` ${JSON.stringify(shown)}`;
  if (record.requestId) line += ` (req ${String(record.requestId).slice(0, 8)})`;
  return line;
}

function writeConsole(level, line) {
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function emit(level, event, message, meta, { context, ship = true } = {}) {
  try {
    const { record, meta: shownMeta } = buildRecord(level, event, message, meta, context);
    writeConsole(record.level, resolveFormat() === 'json' ? JSON.stringify(record) : prettyLine(record, shownMeta));
    if (ship && shipper) shipper.enqueue(record);
    return record;
  } catch {
    // Logging must never take a request down with it.
    return null;
  }
}

const logger = {
  info(message, meta = {}) {
    return emit('info', 'APP_LOG', message, meta);
  },
  warn(message, meta = {}) {
    return emit('warn', 'APP_LOG', message, meta);
  },
  error(message, meta = {}) {
    return emit('error', 'APP_LOG', message, meta);
  },

  /**
   * A security or business event from the catalogue (utils/logEvents.js).
   * The level comes from the catalogue unless `options.level` is given.
   */
  event(name, message, meta = {}, options = {}) {
    return emit(options.level || defaultLevel(name), name, message, meta);
  },

  /** One access log line (middleware/requestLogging.js). */
  access(context, { status, durationMs, aborted }) {
    let level = 'info';
    if (aborted || status >= 400) level = status >= 500 ? 'error' : 'warn';
    const message = `${context.method} ${context.path} ${aborted ? 'aborted' : status} ${durationMs}ms`;
    return emit(level, 'HTTP_REQUEST', message, { status, durationMs, aborted: aborted || undefined }, { context });
  },

  /** Console only, never shipped. For the shipper's own problems. */
  local(level, message, meta = {}) {
    return emit(level, 'APP_LOG', message, meta, { ship: false });
  },

  /**
   * Turns cloud shipping on when it is configured (see utils/logShipper.js).
   * Called once by the server; scripts and tests never ship.
   * Returns { enabled, reason }.
   */
  enableShipping(env = process.env, overrides = {}) {
    const config = resolveShippingConfig(env);
    if (!config.enabled) return { enabled: false, reason: config.reason };
    shipper = createShipper({
      url: config.url,
      token: config.token,
      onProblem: (problem) => logger.local('warn', problem),
      ...overrides,
    });
    shipper.start();
    return { enabled: true, reason: null };
  },

  /** Sends whatever is queued, giving up after `deadlineMs`. Never rejects. */
  async flush(deadlineMs = 2000) {
    return shipper ? shipper.close(deadlineMs) : null;
  },

  /** The shipper's counters (sent, ingested, failed, dropped, ...), or null. */
  shippingStats() {
    return shipper ? shipper.getStats() : null;
  },

  /** For tests: plug in (or remove) a shipper directly. */
  useShipper(replacement) {
    shipper = replacement || null;
  },

  maskEmail,
  resolveFormat,
  buildRecord,
};

module.exports = logger;
module.exports.maskEmail = maskEmail;
