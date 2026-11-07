import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CSP, CSP_HEADER, SECURITY_HEADERS, toNginxHeaders } from '../../securityHeaders.js';
import viteConfig from '../../vite.config.js';

// Guards the "one source of truth" for the client's security headers:
// the build's <meta> CSP, `npm run preview` and nginx in Docker.
// Vitest runs from the client folder (where vite.config.js is).
const nginxConf = readFileSync(resolve(process.cwd(), 'nginx.conf'), 'utf8');
const SNIPPET = 'include /etc/nginx/snippets/security-headers.conf;';

// "location /assets/ { ... }" blocks, keyed by their path.
function locationBlocks(conf) {
  const blocks = {};
  for (const match of conf.matchAll(/location\s+(=\s+)?(\S+)\s*\{([^}]*)\}/g)) {
    blocks[match[2]] = match[3];
  }
  return blocks;
}

describe('client security headers', () => {
  it('has a strict CSP with frame-ancestors in the header version', () => {
    expect(CSP).toContain("default-src 'self'");
    expect(CSP).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(CSP).not.toContain('frame-ancestors'); // ignored in a <meta> tag
    expect(CSP_HEADER).toBe(`${CSP}; frame-ancestors 'none'`);
    expect(SECURITY_HEADERS['Content-Security-Policy']).toBe(CSP_HEADER);
  });

  it('includes the permissions and site isolation headers', () => {
    expect(SECURITY_HEADERS['Permissions-Policy']).toMatch(/camera=\(\)/);
    expect(SECURITY_HEADERS['Cross-Origin-Resource-Policy']).toBe('same-origin');
    expect(SECURITY_HEADERS['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(SECURITY_HEADERS['Cross-Origin-Embedder-Policy']).toBe('require-corp');
  });

  it('npm run preview sends exactly the shared headers', () => {
    expect(viteConfig.preview.headers).toEqual(SECURITY_HEADERS);
  });

  it('generates one nginx add_header line per header, with the same values', () => {
    const lines = toNginxHeaders()
      .split('\n')
      .filter((line) => line.startsWith('add_header'));
    expect(lines).toHaveLength(Object.keys(SECURITY_HEADERS).length);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(lines).toContain(`add_header ${name} "${value}" always;`);
    }
  });

  it('refuses to write a header value that would break the nginx config', () => {
    expect(() => toNginxHeaders({ 'X-Test': 'a"; evil' })).toThrow();
    expect(() => toNginxHeaders({ 'X-Test': 'line\nbreak' })).toThrow();
    expect(() => toNginxHeaders({ 'Bad Name': 'x' })).toThrow();
  });

  it('nginx includes the generated headers wherever it serves files', () => {
    const blocks = locationBlocks(nginxConf);
    expect(Object.keys(blocks)).toEqual(expect.arrayContaining(['/', '/assets/', '/api/']));
    expect(blocks['/']).toContain(SNIPPET);
    expect(blocks['/assets/']).toContain(SNIPPET);
    expect(blocks['/healthz']).toContain(SNIPPET);
    // The api sends its own Helmet headers.
    expect(blocks['/api/']).not.toContain(SNIPPET);
  });

  it('nginx never defines a security header by hand', () => {
    expect(nginxConf).not.toMatch(/add_header\s+(Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|Referrer-Policy)/i);
    expect(nginxConf).toMatch(/server_tokens off;/);
  });

  it('nginx verifies the api certificate and passes the forwarding headers', () => {
    const api = locationBlocks(nginxConf)['/api/'];
    expect(api).toMatch(/proxy_ssl_verify on;/);
    expect(api).toMatch(/proxy_ssl_name api;/);
    expect(api).toMatch(/proxy_set_header Host \$host;/);
    expect(api).toMatch(/proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;/);
    expect(api).toMatch(/proxy_set_header X-Forwarded-Proto \$scheme;/);
  });
});
