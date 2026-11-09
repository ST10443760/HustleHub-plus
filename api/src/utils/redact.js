/**
 * The one scrubber every log record goes through, before it is printed and
 * before it is shipped to the cloud. Whatever a caller passes in, what comes
 * out is safe to store:
 *
 *   - values under sensitive keys (password, token, secret, authorization,
 *     cookie, jwt, mongo_uri, api key, ...) are replaced with [REDACTED]
 *   - JWTs (eyJ...), Axiom tokens (xaat-/xapt-...), "Bearer ..." values and
 *     the user:password part of connection strings are redacted inside any
 *     string
 *   - email addresses are masked ("jane@example.com" -> "j***@example.com")
 *   - control characters (CR, LF, tabs, ...) become spaces, so nobody can
 *     forge a log line by putting a newline in their input
 *   - long strings are cut, depth and size are capped, circular references
 *     are marked, and an Error becomes { name, message } (no stack, no paths)
 *
 * It never throws: anything it can't handle becomes a placeholder.
 */

const MAX_STRING = 512;
const MAX_DEPTH = 6;
const MAX_KEYS = 50;
const MAX_ITEMS = 50;

const REDACTED = '[REDACTED]';

// Key names whose VALUE is never logged, matched anywhere in the key and
// ignoring case: passwordHash, currentPassword, x-api-key, MONGO_URI, ...
const SENSITIVE_KEY =
  /passw(?:or)?d|passphrase|pwd|token|secret|authori[sz]ation|cookie|jwt|mongo_?uri|connection_?string|api[-_ ]?key|credential|private_?key/i;

// Patterns redacted inside any string. Kept simple (no nested repeats), and
// they only ever run on strings already cut to MAX_STRING.
const JWT_PATTERN = /eyJ[\w-]{5,}\.?[\w-]*\.?[\w-]*/g;
const AXIOM_TOKEN_PATTERN = /xa[ap]t-[\w-]+/gi;
const BEARER_PATTERN = /\bBearer\s+[^\s,;"']+/gi;
const CONNECTION_CREDENTIALS = /([a-z][a-z\d+.-]*:\/\/)[^\s:@/]+:[^\s@/]+@/gi;
const EMAIL_PATTERN = /([\w%+-])[\w.%+-]*@([a-z\d-]+\.[a-z\d.-]+)/gi;
// eslint-disable-next-line no-control-regex -- matching control characters is the point: they are removed from logs
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

function scrubString(value, max = MAX_STRING) {
  let text = value.length > max ? `${value.slice(0, max)}...[truncated]` : value;
  text = text
    .replace(CONTROL_CHARS, ' ')
    .replace(JWT_PATTERN, '[REDACTED_JWT]')
    .replace(AXIOM_TOKEN_PATTERN, '[REDACTED_TOKEN]')
    .replace(BEARER_PATTERN, 'Bearer [REDACTED]')
    .replace(CONNECTION_CREDENTIALS, `$1${REDACTED}@`)
    .replace(EMAIL_PATTERN, '$1***@$2');
  return text;
}

function isSensitiveKey(key) {
  return SENSITIVE_KEY.test(key);
}

function scrubError(err) {
  return {
    name: scrubString(String(err.name || 'Error'), 100),
    message: scrubString(String(err.message || '')),
  };
}

function scrubValue(value, depth, seen) {
  if (value === null || value === undefined) return value;

  switch (typeof value) {
    case 'string':
      return scrubString(value);
    case 'number':
      return Number.isFinite(value) ? value : String(value);
    case 'boolean':
      return value;
    case 'bigint':
      return value.toString();
    case 'symbol':
    case 'function':
      return undefined;
    default:
      break;
  }

  if (value instanceof Error) return scrubError(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return '[Binary]';
  // MongoDB ObjectIds (and anything else that prints as an id).
  if (value._bsontype === 'ObjectId' || value._bsontype === 'ObjectID') return String(value);

  if (seen.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[MaxDepth]';
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ITEMS).map((item) => scrubValue(item, depth + 1, seen));
      if (value.length > MAX_ITEMS) items.push(`[${value.length - MAX_ITEMS} more]`);
      return items;
    }

    // Mongoose documents and similar: use their own JSON form, which
    // already leaves out private fields.
    const source =
      typeof value.toJSON === 'function' && Object.getPrototypeOf(value) !== Object.prototype ? value.toJSON() : value;
    if (source !== value && (source === null || typeof source !== 'object')) return scrubValue(source, depth, seen);

    const entries = Object.entries(source);
    const out = [];
    for (const [rawKey, item] of entries.slice(0, MAX_KEYS)) {
      const key = scrubString(rawKey, 100);
      if (isSensitiveKey(rawKey)) {
        out.push([key, REDACTED]);
      } else {
        const clean = scrubValue(item, depth + 1, seen);
        if (clean !== undefined) out.push([key, clean]);
      }
    }
    if (entries.length > MAX_KEYS) out.push(['_truncatedKeys', entries.length - MAX_KEYS]);
    return Object.fromEntries(out);
  } finally {
    seen.delete(value);
  }
}

/** Returns a safe copy of `value`. Never throws. */
function scrub(value) {
  try {
    return scrubValue(value, 0, new WeakSet());
  } catch {
    return '[Unloggable]';
  }
}

module.exports = { scrub, scrubString, isSensitiveKey, REDACTED, MAX_STRING, MAX_DEPTH, MAX_KEYS, MAX_ITEMS };
