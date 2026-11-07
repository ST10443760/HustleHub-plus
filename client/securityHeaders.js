/**
 * The ONE place the client's Content-Security-Policy and security headers
 * are defined. Used by:
 *   - vite.config.js: the CSP <meta> tag in the built index.html, and the
 *     real headers sent by `npm run preview`
 *   - scripts/nginx-security-headers.mjs: generates the nginx add_header
 *     lines for the Docker image at build time
 * so the dev preview and the container can never drift apart.
 *
 * No 'unsafe-inline' and no 'unsafe-eval' anywhere: the app is one bundled
 * script and one stylesheet, both served from the same origin, and API
 * calls go to the same origin (/api, proxied by Vite or nginx).
 */

export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

// For the <meta> tag. frame-ancestors is ignored in a <meta> tag - browsers
// only honour it as a real response header - so it isn't in this one.
export const CSP = CSP_DIRECTIVES.join('; ');

export const CSP_HEADER = `${CSP}; frame-ancestors 'none'`;

// Sent as real response headers by `npm run preview` and by nginx.
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CSP_HEADER,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
});

/**
 * The same headers as nginx directives. `always` makes nginx send them on
 * error responses (404 and so on) too. Values are double-quoted, so a
 * double quote or a line break in a value is refused rather than written
 * into the config.
 */
export function toNginxHeaders(headers = SECURITY_HEADERS) {
  const lines = Object.entries(headers).map(([name, value]) => {
    if (!/^[A-Za-z0-9-]+$/.test(name) || /["\r\n\\]/.test(value)) {
      throw new Error(`Header ${name} can't be written safely to nginx config`);
    }
    return `add_header ${name} "${value}" always;`;
  });
  return `# Generated from client/securityHeaders.js at image build time. Do not edit.\n${lines.join('\n')}\n`;
}
