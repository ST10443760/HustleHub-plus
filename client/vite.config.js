import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Content-Security-Policy for the BUILT client. No 'unsafe-inline' and no
// 'unsafe-eval' anywhere: the app is one bundled script and one stylesheet,
// both served from the same origin, and API calls go to the same origin
// (/api, proxied in dev and preview).
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
]

const CSP = CSP_DIRECTIVES.join('; ')

// frame-ancestors is ignored in a <meta> tag - browsers only honour it as a
// real response header - so it's only added to the headers below.
const CSP_HEADER = `${CSP}; frame-ancestors 'none'`

// Adds the CSP as a <meta> tag to dist/index.html. Build only: the Vite dev
// server injects inline scripts for hot reload, which this policy would
// (correctly) block, so `npm run dev` runs without it.
function cspMetaTag() {
  return {
    name: 'hustlehub-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

// Dev only: forward API calls to the local HTTPS API. secure: false is
// needed because the local cert is self-signed. Never use this in prod.
const apiProxy = {
  '/api': {
    target: 'https://localhost:5000',
    changeOrigin: true,
    secure: false,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspMetaTag()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  // `npm run preview` serves the built app with the policy as real headers,
  // plus the same /api proxy, so the production build can be tested end to end.
  preview: {
    port: 4173,
    strictPort: true,
    proxy: apiProxy,
    headers: {
      'Content-Security-Policy': CSP_HEADER,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
    },
  },
  // Vitest: components render in jsdom; no test touches the real network.
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
  },
})
