# Test evidence

Raw, unedited output of the test suites, saved as plain text from fresh
runs on **8 November 2026** (Windows 11, Docker Desktop, Node 24.18.1 on the
host, Newman 6.2.3, Vitest 5.0.3). Every run passed with 0 failures.

**Local (npm) runs**, against MongoDB Atlas:

| File | What it is | Command (run from the folder shown) | Result |
|---|---|---|---|
| [`newman-main-results.txt`](newman-main-results.txt) | Main Postman collection: Health, Auth, RBAC, Gigs, Bookings, Income (including the tax estimate), Account security (lockout, change password, sign out everywhere, audit log) and Security folders, **including the admin tests** | `api/`: API started with `npm run start:test`, then `npx newman run postman/HustleHub_API.postman_collection.json --insecure --reporters cli --color off --env-var admin_email=<ADMIN_EMAIL> --env-var admin_password=<ADMIN_PASSWORD>` | **131 requests, 246 assertions, 0 failed** |
| [`newman-rate-limits-results.txt`](newman-rate-limits-results.txt) | Rate limit collection against the **strict** limits: the 6th failed login and the 11th booking are refused with `429` + `Retry-After` | `api/`: API freshly started with `npm run dev`, then `npx newman run postman/HustleHub_RateLimits.postman_collection.json --insecure --reporters cli --color off` | **20 requests, 26 assertions, 0 failed** |
| [`vitest-results.txt`](vitest-results.txt) | Frontend tests (Vitest + React Testing Library), one line per test | `client/`: `npm run test:run -- --reporter=verbose` | **21 test files, 110 tests passed** |
| [`api-unit-results.txt`](api-unit-results.txt) | Backend unit tests (Node test runner): tax calculator and tax years, health check, startup settings check, trust proxy and rate limit buckets, account lockout logic, token versions, auth and audit log validators, audit log append-only guards, money rounding, rate limit config. No database or secrets needed | `api/`: `npm test` | **132 tests passed** |

**Docker runs**, against the Compose stack and its own MongoDB replica set:

| File | What it is | Command (repo root) | Result |
|---|---|---|---|
| [`docker-compose-ps.txt`](docker-compose-ps.txt) | Every service healthy (`certs` is a one-shot step, so `Exited (0)` is correct), and the user each container runs as (none is root) | `docker compose ps -a`, `docker compose exec <service> id` | api uid 1000, client uid 101, mongo uid 999 |
| [`docker-smoke-test-results.txt`](docker-smoke-test-results.txt) | Smoke test through the client container: page + CSP header, `/api/health` through the proxy, register, login, protected route with and without a token, admin route as a client, change the password (old token rejected, new token works) | `node docker/smoke-test.mjs` | **15 checks passed** |
| [`docker-newman-results.txt`](docker-newman-results.txt) | The main Postman collection against the API container, including bookings (MongoDB transactions on the replica set) and the admin tests | `docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build --wait`, `docker compose run --rm seed`, then the Newman command from the README with `base_url` set | **131 requests, 246 assertions, 0 failed** |

Notes:

- The admin credentials were read from `api/.env` (local) or the root
  `.env` (Docker) and passed to Newman as arguments by a small script, so
  they never appear in a shell, a log or these files. Without them, the
  main collection skips the admin-only requests cleanly.
- `--insecure` is needed because the local HTTPS certificate is
  self-signed. `--color off` keeps the files plain text.
- Every file was checked before it was committed for JWTs (`eyJ...`),
  `Bearer` tokens, MongoDB connection strings with credentials, the JWT
  secrets and the admin emails and passwords: 0 hits. (The only "Bearer"
  is the name of a Vitest test.)
- The test users these runs created (`test-...@example.com`) were removed
  afterwards with `npm run clean:test` (and its Docker equivalent).
- Screenshots of the same kind of runs: `docs/screenshots/11-newman-pass.png`,
  `11b-newman-rate-limits.png` and `12-vitest-pass.png`.
