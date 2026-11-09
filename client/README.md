# HustleHub+ client

React (Vite) frontend for HustleHub+. See the main README in the project
root for how to run it alongside the API, and for the security notes.

```bash
npm ci
npm run dev       # http://localhost:5173, proxies /api to https://localhost:5000
npm run build     # production build in dist/ (with the CSP meta tag)
npm run preview   # serves dist/ with the same security headers as nginx
npm run test:run  # Vitest, once (npm test for watch mode)
npm run lint      # ESLint (security, React and hooks rules)
```
