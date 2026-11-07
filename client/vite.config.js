import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { CSP, SECURITY_HEADERS } from './securityHeaders.js'

// The CSP and security headers live in securityHeaders.js, the single
// source of truth shared with the nginx config in the Docker image.

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
    // Fail loudly if 5173 is taken instead of quietly moving to 5174: the API's
    // CORS only accepts CLIENT_ORIGIN (http://localhost:5173), so any other
    // port would break every POST with "Origin not allowed".
    strictPort: true,
    proxy: apiProxy,
  },
  // `npm run preview` serves the built app with the policy as real headers,
  // plus the same /api proxy, so the production build can be tested end to end.
  // Same port as dev on purpose: browsers send an Origin header on POSTs, the
  // proxy passes it on, and the API's CORS only accepts CLIENT_ORIGIN
  // (http://localhost:5173). Stop the dev server before running preview.
  preview: {
    port: 5173,
    strictPort: true,
    proxy: apiProxy,
    headers: { ...SECURITY_HEADERS },
  },
  // Vitest: components render in jsdom; no test touches the real network.
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
    // Tests that type a lot with user-event can take several seconds on a slow
    // or busy machine; 5s (the default) made them flaky under load.
    testTimeout: 20000,
  },
})
