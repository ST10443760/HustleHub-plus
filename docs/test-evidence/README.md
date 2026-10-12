# Test evidence

Raw, unedited output of the three test suites, saved as plain text from
fresh runs on **12 October 2026** (Windows 11, Node 24.18.1, Newman 6.2.3,
Vitest 5.0.3, MongoDB Atlas). All three runs passed with 0 failures.

| File | What it is | Command (run from the folder shown) | Result |
|---|---|---|---|
| [`newman-main-results.txt`](newman-main-results.txt) | Main Postman collection: Auth, RBAC, Gigs, Bookings, Income and Security folders, **including the admin tests** | `api/`: API started with `npm run start:test`, then `npx newman run postman/HustleHub_API.postman_collection.json --insecure --reporters cli --color off --env-var admin_email=<ADMIN_EMAIL> --env-var admin_password=<ADMIN_PASSWORD>` | **85 requests, 145 assertions, 0 failed** |
| [`newman-rate-limits-results.txt`](newman-rate-limits-results.txt) | Rate limit collection against the **strict** limits: the 6th failed login and the 11th booking are refused with `429` + `Retry-After` | `api/`: API freshly started with `npm run dev`, then `npx newman run postman/HustleHub_RateLimits.postman_collection.json --insecure --reporters cli --color off` | **20 requests, 26 assertions, 0 failed** |
| [`vitest-results.txt`](vitest-results.txt) | Frontend tests (Vitest + React Testing Library), one line per test | `client/`: `npm run test:run -- --reporter=verbose` | **16 test files, 67 tests passed** |

Notes:

- The admin credentials were read from `api/.env` and passed to Newman as
  arguments by a small script, so they never appear in a shell, a log or
  these files. Without them, the main collection skips the 5 admin-only
  requests cleanly and runs 80 requests / 134 assertions.
- `--insecure` is needed because the local HTTPS certificate is
  self-signed. `--color off` keeps the files plain text.
- Every file was checked before it was committed for JWTs (`eyJ...`),
  `Bearer` tokens, `mongodb://` strings, the database URI, the JWT secret
  and the admin email and password: 0 hits.
- The test users these runs created (`test-...@example.com`) were removed
  afterwards with `npm run clean:test`.
- Screenshots of the same kind of runs: `docs/screenshots/11-newman-pass.png`,
  `11b-newman-rate-limits.png` and `12-vitest-pass.png`.
