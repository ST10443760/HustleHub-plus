# Logging evidence

Evidence for the API's structured logging and its cloud logging in Axiom.
Every record here is real output from a local run on **9 November 2026**.
Nothing was edited by hand; the scrubber had already redacted each record
before it was printed or shipped. How the logging works is explained in
the main README, section "Logging and monitoring".

| File | What it is |
|---|---|
| [`sample-events.jsonl`](sample-events.jsonl) | One real record per event name (31 lines covering all 25 names in the catalogue, with the different reasons for login failures, access denials and admin actions), exactly as the local mock receiver got them. The last line is the `LOG_TEST` record that `npm run log:test` sends, built by the same code. `_time` is the field Axiom uses as the event time. |
| [`docker-json-logs.jsonl`](docker-json-logs.jsonl) | `docker compose logs api` from the Docker stack during the smoke test: one JSON record per line (`LOG_FORMAT=json`, the Compose default). The stack ran with shipping off. |
| [`mock-shipping-check.txt`](mock-shipping-check.txt) | The local mock check: the real API shipping to a mock ingest server on 127.0.0.1. Lists every step, its HTTP status, the shipper's counts and the event names that arrived. |
| [`live-shipping-check.txt`](live-shipping-check.txt) | The live check against Axiom: `npm run log:test`, then a small run in development mode (about 40 records). |
| [`axiom-queries.md`](axiom-queries.md) | Ready-to-paste APL queries (failed logins by IP, lockouts, 403s by route, 429s by limiter, bookings per hour, server errors), three monitors for the free plan, and a small dashboard. |

## How these were produced

**Mock check.** A small script started the real `api/src/server.js` with
`NODE_ENV=test`, `LOG_SHIPPING_IN_TEST=1` and `LOG_SHIPPING_URL` pointing
at a mock receiver on 127.0.0.1. The mock answers like Axiom's ingest API
(`{"ingested":n,"failed":0,...}`) and checks the `Authorization` header.
Each event was triggered through the HTTP API, the same way the app or
Postman would:

- registering, logging in and failing to log in, until the account
  locked and the IP limiter answered 429
- creating, updating and deleting gigs, and booking a deleted gig
  (`BOOKING_FAILED`)
- a booking and its transaction, and a client opening `/api/income` (403)
- a bad token, bad input, an operator injection and another freelancer's gig
- changing the password, and the admin's actions

Two failures were simulated:

- **Audit store outage:** the audit model was made to fail for one
  request, which gives `AUDIT_WRITE_FAILED`. The request still succeeded.
- **Database outage:** the database connection was closed, which gives
  `ERROR_UNHANDLED` and a 500.

All 90 records arrived and none were dropped. `sample-events.jsonl` is a
selection of those records.

**Live check.** `npm run log:test` sent one labelled event and Axiom
answered `HTTP 200, ingested: 1, failed: 0`. Then the API ran in
development mode with the real settings from `api/.env`, and a short
script triggered these events through the HTTP API:

- 3 registrations, a login and a gig
- a booking and its transaction
- a 403 (a client opening `/api/income`)
- 5 wrong passwords, which locked the account
- a 6th try, refused with 429 by the strict IP limiter

That was 39 records in all. The shipper's own counts at shutdown were
`sent 39, ingested 39, failed 0, dropped 0, lost 0`: every request got
HTTP 200, with no retries. This shows that Axiom **accepted** the records.
Seeing them in Axiom's Stream and Query tabs is what the screenshots are
for.

**Secrets.** Every file here, and everything the mock received, was
searched for these before committing, with 0 hits:

- JWTs (`eyJ...`) and Axiom tokens (`xaat-...`)
- `Bearer` values and connection strings with credentials
- the JWT secret, the admin email and password, and the Axiom token and URL

Emails only appear masked (`t***@example.com`). The test users these runs
created were removed afterwards with `npm run clean:test`.

**Not shipped.** The automated runs (`npm test`, Newman, Vitest, the smoke
test and the Compose test override) never shipped anything. Each of them
logs `cloudLogging: off` at startup.
