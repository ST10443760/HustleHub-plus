/**
 * Express "trust proxy" setting, from TRUST_PROXY.
 *
 * Unset (the default, and how `npm run dev` runs): off. req.ip is the
 * address of whoever opened the connection, exactly as before.
 *
 * TRUST_PROXY=1 (Docker Compose): the API sits behind ONE reverse proxy
 * (nginx in the client container). req.ip is then taken from the last
 * X-Forwarded-For entry that nginx added, i.e. the real client, so the
 * per-IP login and register limits apply per user instead of treating
 * everyone as "the nginx container".
 *
 * Only a small whole number of hops is accepted. "true" (trust every hop)
 * would let any client pick its own IP by sending X-Forwarded-For, so it is
 * rejected. This is only safe when the API can't be reached directly by
 * untrusted clients, which is why Compose doesn't publish the API port.
 */
const MAX_HOPS = 5;

function resolveTrustProxy(env = process.env) {
  const raw = env.TRUST_PROXY === undefined ? '' : String(env.TRUST_PROXY).trim();
  if (raw === '' || raw === '0' || raw.toLowerCase() === 'false') return false;

  if (/^\d+$/.test(raw)) {
    const hops = Number(raw);
    if (hops >= 1 && hops <= MAX_HOPS) return hops;
  }
  throw new Error(`TRUST_PROXY must be a number of proxy hops from 1 to ${MAX_HOPS} (for example 1), or unset`);
}

module.exports = { resolveTrustProxy };
