# HustleHub+

[![CI](https://github.com/EMKNDW/insy7314-g2-2026-insy7314-2026-poe-st10443760/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/EMKNDW/insy7314-g2-2026-insy7314-2026-poe-st10443760/actions/workflows/ci.yml)

HustleHub+ is a secure freelance marketplace. Freelancers advertise gigs,
clients browse and book them, every booking creates a transaction record,
and freelancers track their income and an estimate of the income tax on
it. The system handles credentials, payment records and income data, so
security was treated as a requirement from the first line of code, not
something added at the end.

This is the final submission (**Part 3: DevSecOps, Monitoring and
Finalisation**) of the INSY7314 / APDS7311 POE. It is a full MERN
application (React, Express, MongoDB) that runs locally with npm or as
containers with Docker Compose, is tested and scanned by a GitHub Actions
pipeline, and ships its security logs to a cloud logging platform.

**Module:** INSY7314/w (Information Systems 3D) and APDS7311/w (Application
Development Security)
**Group:** Null Devs
**Group Leader:** Muaaz (ST10443760)
**Repository:** <https://github.com/EMKNDW/insy7314-g2-2026-insy7314-2026-poe-st10443760>

> The pipeline badge above shows a failing or empty state. That is not a
> code failure: GitHub will not start any job for this repository while
> the account is locked for a billing issue. See
> [Pipeline status and the billing lock](#pipeline-status-and-the-billing-lock).

---

## Contents

1. [Overview and features](#1-overview-and-features)
2. [Architecture](#2-architecture)
3. [Tech stack](#3-tech-stack)
4. [Getting started](#4-getting-started)
5. [Using the app](#5-using-the-app)
6. [API reference](#6-api-reference)
7. [Tax estimation](#7-tax-estimation)
8. [Security implementation](#8-security-implementation)
9. [Final security review](#9-final-security-review)
10. [Testing](#10-testing)
11. [CI/CD pipeline](#11-cicd-pipeline)
12. [Static code analysis](#12-static-code-analysis)
13. [Docker](#13-docker)
14. [Logging and monitoring](#14-logging-and-monitoring)
15. [Demonstration evidence](#15-demonstration-evidence)
16. [What changed in Part 3](#16-what-changed-in-part-3)
17. [Requirements traceability](#17-requirements-traceability)
18. [Troubleshooting, limitations, team and repository](#18-troubleshooting-limitations-team-and-repository)

## 1. Overview and features

HustleHub+ has three user types:

- **Clients** browse active gigs, book them (with a simulated payment) and
  see their bookings and transactions.
- **Freelancers** create and manage their own gigs, see the bookings on
  them, and track their income on a dashboard with a South African income
  tax estimate.
- **Admins** (created by a seed script, never through sign-up) see every
  user and transaction, can remove any gig, and read the audit log.

Every booking creates a transaction record linked to both the client and
the freelancer, in the same database transaction. Every rule (who is
logged in, which role may call a route, who owns a record, which fields a
request may set) is enforced by the API on every request. The React
client only hides what a user can't use.

### Features

**For clients**
- Register and log in (the role is chosen at sign-up: client or freelancer)
- Browse active gigs with search, category and price filters and paging
- Gig detail page and booking with a confirmation step. Payment is
  simulated and every booking returns a transaction reference
- My bookings and My transactions

**For freelancers**
- Create, edit, activate, deactivate and delete their own gigs (a gig that
  already has bookings is deactivated instead of deleted)
- See the bookings on their gigs, with the client's name
- Income dashboard: total earned, estimated tax, take-home pay, effective
  tax rate, a monthly income chart, the tax-by-bracket table and the
  per-booking income table, for a selectable tax year

**For admins**
- List all users and all transactions (paginated)
- Remove any gig, with the same delete-or-deactivate rule
- Audit log of admin gig removals, password changes, sign-outs and
  account lockouts, with an action filter

**For everyone who is logged in**
- An Account page to change the password and to sign out of all devices

**Security and operations**
- JWT authentication with the role read from the database on every
  request; RBAC and ownership checks on every route
- Validation with strict types, unknown fields rejected on the gig,
  booking, account and query routes (registration and login read only
  their named fields), HTML escaping, NoSQL operator stripping and a
  regex-safe search
- Rate limits on login, registration, booking and password changes, plus
  a general limit; per-account lockout after 5 failed logins
- Session revocation: changing the password or signing out everywhere
  ends every older token
- Helmet with a strict CSP on the API, the same strict policy on the
  client, CORS locked to the client's origin
- Bookings and their transactions written atomically; money kept to 2
  decimals; tax worked out in whole cents
- Structured security logging with request ids and redaction, shipped to
  Axiom; an append-only audit log
- Hardened Docker images and Compose stack; a GitHub Actions pipeline with
  tests, secret scanning, image scanning, static analysis and a dynamic
  scan
- 191 API unit tests, 110 frontend tests, 151 Newman requests with 272
  assertions over two Postman collections, and a 15-check smoke test, all
  passing

### How the project progressed

| Part | What it delivered |
|---|---|
| **Part 1: Secure Foundations** | Express API with register, login and one protected route; bcryptjs password hashing; JWT with `protect` and `requireRole`; express-validator; a central error handler; HTTPS with a self-signed certificate; a Postman collection. Users were kept in memory. |
| **Part 2: Secure Stack** | MongoDB with Mongoose; the React client; gig management with ownership checks; bookings with simulated payments and a transaction for every booking; income tracking; the admin area; rate limiting; an explicit Helmet CSP; CORS; NoSQL sanitising; the main and rate limit Newman collections and the first Vitest tests. |
| **Part 3: DevSecOps, Monitoring and Finalisation** | The tax estimate and income dashboard; Dockerfiles and Docker Compose; the GitHub Actions pipeline; ESLint security rules and Semgrep with every finding fixed; account lockout, change password with session revocation and the admin audit log; structured logging shipped to Axiom; this final security review and README. See [What changed in Part 3](#16-what-changed-in-part-3). |

## 4. Architecture

The system follows a MERN architecture: a **React** frontend, an
**Express/Node** backend and a **MongoDB** database (via Mongoose). Part 1
kept users in memory; Part 2 replaces that with MongoDB, so accounts and all
marketplace data now persist across server restarts.

```mermaid
flowchart LR
    user(["Browser"])

    subgraph client["React client - Vite, port 5173"]
        ui["Pages and components<br/>React escapes all text<br/>strict CSP on the built app"]
        apiClient["api/client.js<br/>relative /api URLs + Bearer token"]
        proxy["Vite proxy<br/>dev and preview"]
    end

    subgraph api["Express API - https://localhost:5000"]
        direction TB
        pipeline["1. request log<br/>2. Helmet headers + CSP<br/>3. CORS locked to CLIENT_ORIGIN<br/>4. general rate limit<br/>5. JSON body parser, 10kb<br/>6. NoSQL operator sanitiser"]
        routes["Routers<br/>protect - requireRole - route rate limit<br/>validators - validateObjectId - requireOwnership"]
        controllers["Controllers"]
        models["Mongoose models<br/>User, Gig, Booking, Transaction"]
        errors["Central error handler<br/>safe JSON errors only"]
        pipeline --> routes --> controllers --> models
        routes -. "4xx" .-> errors
        controllers -. "errors" .-> errors
    end

    db[("MongoDB Atlas<br/>replica set, transactions")]

    user --> ui --> apiClient --> proxy
    proxy -- "HTTPS, self-signed cert" --> pipeline
    models --> db
```

Every request passes through the same middleware pipeline, in this order,
before any route runs: a request log line, Helmet's security headers, CORS
(locked to `CLIENT_ORIGIN`), the general rate limit, the JSON body parser
(10kb limit) and the NoSQL operator sanitiser. Each router then adds its own
checks - `protect` (JWT + user loaded from the database), `requireRole`,
route-specific rate limits, validators, `validateObjectId` and
`requireOwnership` - before the controller talks to MongoDB through Mongoose.

> `docs/architecture-diagram.png` is the Part 1 diagram (API only). The
> Mermaid diagrams in this README are the current ones.

Errors raised at any stage are caught by a single centralised error handler
registered last in the middleware chain, so every error response is
formatted consistently and never leaks internal details.

### Data model

```mermaid
erDiagram
    USER ||--o{ GIG : "offers (freelancer)"
    USER ||--o{ BOOKING : "makes (client)"
    USER ||--o{ BOOKING : "receives (freelancer)"
    GIG ||--o{ BOOKING : "is booked as"
    BOOKING ||--|| TRANSACTION : "has exactly one"
    USER ||--o{ TRANSACTION : "pays (client)"
    USER ||--o{ TRANSACTION : "earns (freelancer)"
    GIG ||--o{ TRANSACTION : "is paid for in"

    USER {
        ObjectId _id PK
        string name "HTML-escaped"
        string email UK "lowercase"
        string passwordHash "bcrypt, never selected by default"
        string role "client, freelancer or admin"
        date createdAt
        date updatedAt
    }
    GIG {
        ObjectId _id PK
        ObjectId freelancer FK "owner, from the token"
        string title "HTML-escaped"
        string description "HTML-escaped"
        number price "1 to 100000, 2 decimals"
        string category "fixed list"
        number deliveryDays "1 to 90"
        boolean isActive
        date createdAt
        date updatedAt
    }
    BOOKING {
        ObjectId _id PK
        ObjectId gig FK
        ObjectId client FK "from the token"
        ObjectId freelancer FK "from the gig"
        string gigTitle "snapshot at booking time"
        number price "snapshot at booking time"
        string status "confirmed or cancelled"
        date createdAt
        date updatedAt
    }
    TRANSACTION {
        ObjectId _id PK
        ObjectId booking FK "unique: one per booking"
        ObjectId gig FK
        ObjectId client FK
        ObjectId freelancer FK
        number amount "rounded to 2 decimals"
        string status "completed or refunded"
        string reference UK "TXN-date-random"
        date createdAt
        date updatedAt
    }
```

Every booking stores a snapshot of the gig's title and price, and has exactly
one transaction (a unique index on `transaction.booking`). The owner and
parties on every record come from the verified token and the database,
never from the request.

## 5. Project Structure

```
api/                           # Express backend
  src/
    app.js                     # Express app, middleware pipeline, route mounting
    server.js                  # entry point - starts the HTTPS server
    routes/
      authRoutes.js            # /api/auth/register, /login, /me
      adminRoutes.js           # /api/admin/* (admin role only)
      gigRoutes.js             # /api/gigs (browse, create, update, delete)
      bookingRoutes.js         # /api/bookings (book a gig, my bookings, one booking)
      transactionRoutes.js     # /api/transactions/mine
      incomeRoutes.js          # /api/income (freelancer earnings)
    controllers/
      authController.js        # register/login business logic
      adminController.js       # admin-only actions (users, all transactions)
      gigController.js         # gig listing, search and owner-only changes
      bookingController.js     # booking + transaction in one database transaction
      transactionController.js # each user's own transactions
      incomeController.js      # income aggregation over completed transactions
    config/
      db.js                    # MongoDB connection (Mongoose)
      security.js              # Helmet/CSP options, CORS locked to CLIENT_ORIGIN
      rateLimits.js            # rate limit numbers (strict defaults, no overrides in production)
    models/
      User.js                  # users (password hash never selected by default)
      Gig.js                   # gig listings owned by a freelancer
      Booking.js               # a client's booking of a gig
      Transaction.js           # payment record created for every booking
    middleware/
      authMiddleware.js        # JWT verification ("protect") + role check ("requireRole")
      ownership.js             # "requireOwnership" - users can only touch their own records
      validateObjectId.js      # rejects malformed :id params with a 400
      errorHandler.js          # centralised error handling
      validators.js            # input validation rules (express-validator)
      gigValidators.js         # gig body + list query rules, HTML escaping
      bookingValidators.js     # booking body: gigId only
      sanitize.js              # strips $ and . keys from body, query and params
      rateLimiters.js          # login, register, booking and general limiters
    utils/
      logger.js                # shared logging utility
      generateToken.js         # JWT signing helper
      password.js              # bcryptjs hashing (shared salt rounds)
      escapeRegex.js           # makes search text safe to use in a regex
      money.js                 # rounds money to 2 decimals
      gigRemoval.js            # shared delete-or-deactivate rule for gigs
  scripts/
    seedAdmin.js               # creates the admin account (npm run seed:admin)
    cleanTestData.js           # removes test users and their data (npm run clean:test)
    startTest.js               # starts the API with relaxed rate limits (npm run start:test)
    generateCerts.js           # creates the local HTTPS certificate (npm run certs)
  certs/                       # local self-signed SSL certificate (see api/certs/README.md)
  postman/
    HustleHub_API.postman_collection.json         # main API tests (Auth, RBAC, Gigs, Bookings, Income, Security)
    HustleHub_RateLimits.postman_collection.json  # rate limit tests (strict server)
client/                        # React frontend (Vite)
  index.html                   # page shell and title
  vite.config.js               # dev server + /api proxy to the HTTPS API
  src/
    main.jsx                   # router, auth provider, global styles
    App.jsx                    # routes, grouped by role
    api/                       # fetch wrapper (client.js) and one file per resource
    context/                   # AuthProvider, useAuth
    components/                # layout/nav, ProtectedRoute, form field, gig card, booking panel
    pages/                     # login, register, gigs, gig detail, my bookings, my transactions
    utils/                     # formatting, entity decoding, validation, token storage, hooks
    styles/                    # global.css (CSS variables, no UI library)
    test/                      # Vitest setup and a render helper (tests sit next to the code: *.test.jsx)
docs/
  architecture-diagram.png     # Part 1 diagram (the Mermaid diagrams in this README are current)
  screenshots/                 # Part 2 screenshots + README of what each shows; part1/ = Part 1 screenshots
  test-evidence/               # saved Newman and Vitest output from real runs + README
```

## 6. How to Run

Every command below was run, in this order, on a fresh clone of the
repository (Windows 11 with Git Bash and PowerShell, plus a Linux container
for the certificate and Node 22 checks).

### Requirements

| Dependency | Version | Used for |
|---|---|---|
| Node.js | **22 or newer** (22.22+ or 24.15+; the client's test tools don't support odd-numbered releases) | Running the API, building the client and all tests. `engines` is set in both `package.json` files |
| npm | comes with Node | Installing packages (`npm ci`) and running the scripts |
| Git | any recent | Cloning the repository. On Windows, Git for Windows also provides OpenSSL |
| A MongoDB database | MongoDB Atlas (free tier) or a local MongoDB running as a replica set | Storing all data. Bookings use multi-document transactions, which need a replica set (every Atlas cluster is one). See **Getting a MONGO_URI** |
| OpenSSL | any recent, used through `npm run certs` | Creating the local self-signed HTTPS certificate |
| Newman | 6, used through `npx` (nothing to install) | Running the Postman collections from the command line |

All other dependencies are installed by `npm ci` from the lock files.

The backend and frontend are separate projects; run each in its own terminal.

### Backend (`api/`)

```bash
cd api
npm ci                    # exact versions from package-lock.json
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
```

Then edit `api/.env`. It is git-ignored and never committed; the values below
are the **placeholders** from `.env.example`, never real ones. These are all
the variables the code reads:

| Variable | Required? | Purpose | Placeholder |
|---|---|---|---|
| `MONGO_URI` | **Required** | MongoDB connection string (see **Getting a MONGO_URI**) | `mongodb://localhost:27017/hustlehub` |
| `JWT_SECRET` | **Required** | Secret that signs the login tokens. Use a long random string | `replace_with_a_long_random_secret` |
| `JWT_EXPIRES_IN` | Optional (default `1h`) | How long a login token stays valid | `1h` |
| `CLIENT_ORIGIN` | Optional in development (default `http://localhost:5173`), **required in production** | The only browser origin the API accepts (CORS) and allows in the CSP. Exact origin, no trailing slash | `http://localhost:5173` |
| `ADMIN_EMAIL` | **Required for** `npm run seed:admin` | Email of the admin account the seed script creates | `admin@example.com` |
| `ADMIN_PASSWORD` | **Required for** `npm run seed:admin` | Its password, at least 12 characters | `replace_with_a_strong_password` |
| `ADMIN_NAME` | Optional (default `Administrator`) | Its display name | `HustleHub Admin` |
| `PORT` | Optional (default `5000`) | API port. The client proxy and the Postman collections expect `5000` | `5000` |
| `NODE_ENV` | Optional (default `development`) | `production` forces the strict rate limits, requires `CLIENT_ORIGIN` and leaves stack traces out of the logs | `development` |
| `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_BOOKING_MAX`, `RATE_LIMIT_GENERAL_MAX` | Optional, local testing only | Raise a rate limit's maximum. **Ignored when `NODE_ENV` is `production`**. `npm run start:test` sets them for you, so leave them commented out | commented out |

The **client needs no env file**: it only calls relative `/api/...` URLs, and
the Vite proxy forwards them to the API.

#### Getting a MONGO_URI

**MongoDB Atlas (free, what this project was tested on):**

1. Create a free account at <https://www.mongodb.com/cloud/atlas> and create a
   free (M0) cluster.
2. **Database Access** → Add New Database User. Give it a username and a
   password made of **plain letters and numbers only** (symbols such as
   `@`, `:` or `/` would have to be URL-encoded in the connection string),
   with the "Read and write to any database" role.
3. **Network Access** → Add IP Address → **Add Current IP Address**.
4. **Connect** → Drivers, and copy the connection string. Put your database
   user's password in place of `<password>`, and add the database name
   `hustlehub` after the host, before the `?`:
   `mongodb+srv://<user>:<password>@<your-cluster-host>/hustlehub?retryWrites=true&w=majority`
5. Paste it into `api/.env` as `MONGO_URI`. If the `mongodb+srv://` string
   fails with `querySrv ECONNREFUSED`, see **Troubleshooting**.

**Local MongoDB:** `mongodb://localhost:27017/hustlehub`. A plain
(standalone) local MongoDB starts the API and serves everything except
bookings, because MongoDB only allows multi-document transactions on a
replica set (checked: on a standalone MongoDB 8.0 the booking transaction
is refused). To use a local database, run it as a single-node replica set as
MongoDB documents it: start `mongod` with `--replSet rs0` (or set
`replication.replSetName: rs0` in `mongod.cfg` and restart the service), then
run `rs.initiate()` once in `mongosh`, and keep the same URI. This project was
tested on Atlas; the local replica-set setup was not run here.

Generate the local HTTPS certificate **before starting the API**, seed the
admin, then start the server:

```bash
npm run certs             # creates api/certs/key.pem and cert.pem (git-ignored)
npm run seed:admin        # creates the admin account; safe to run again
npm run dev               # https://localhost:5000 (nodemon)
```

- `npm run certs` works the same in Git Bash, PowerShell, macOS and Linux.
  To run OpenSSL by hand instead (and why the raw command fails in Git
  Bash), see [`api/certs/README.md`](api/certs/README.md).
- **If the certificate is missing**, the API still starts but on plain
  **HTTP** and logs a warning. The client proxy and both Postman collections
  expect HTTPS, so the client then gets `502` errors (Vite logs
  `EPROTO ... wrong version number`) and Newman fails. Run `npm run certs`
  and restart.
- The server connects to MongoDB before it starts listening and exits with a
  safe message (never the URI) if it can't.
- Check it: `curl -k https://localhost:5000/api/health`. Browsers and Postman
  warn about the self-signed certificate - that's expected locally (in
  Postman, turn off "SSL certificate verification" under Settings → General).
- Other API scripts: `npm start` (no nodemon), `npm run start:test` (relaxed
  rate limits for the main Newman run - see **Testing**), `npm run clean:test`
  (see below).

### Frontend (`client/`)

With the API running, in a second terminal:

```bash
cd client
npm ci
npm run dev               # http://localhost:5173
```

Open `http://localhost:5173`. Vite proxies every `/api` request to
`https://localhost:5000`, so the client only ever calls relative `/api/...`
URLs and no API host or port is hard-coded. The proxy skips certificate
checks (`secure: false`) only because the local certificate is self-signed;
this setting is dev-only.

### Built client (production build)

Stop the dev server first (preview uses the same port), keep the API running:

```bash
cd client
npm run build             # production build in client/dist/
npm run preview           # serves dist/ at http://localhost:5173 with the CSP headers and the /api proxy
```

Preview deliberately uses the same port as the dev server. Browsers send an
`Origin` header on POST requests, the proxy passes it on, and the API's CORS
only accepts `CLIENT_ORIGIN` (`http://localhost:5173`), so the built app has to
be served from that origin too.

### Clearing test data

Newman runs and manual testing create throwaway users
(`test-...@example.com`, `role-...@example.com`). To remove only those users
and the gigs, bookings and transactions that belong to them:

```bash
cd api
npm run clean:test
```

It prints how much it removed, never deletes an admin, and refuses to run
when `NODE_ENV` is `production`.

### Running with Docker

The whole stack (MongoDB, the API and the React client) can also run in
containers with one command. The normal `npm run dev` workflow above is
**unchanged** and doesn't need Docker. The two don't share data: Docker
uses its own MongoDB unless you point it at Atlas.

**Prerequisites:** Docker Desktop (Windows/macOS) or Docker Engine with the
Compose plugin (Linux), running. Nothing else: no local Node, MongoDB or
OpenSSL needed. Port **5173** must be free (stop `npm run dev` first).

```mermaid
flowchart LR
    B["Browser<br/>http://localhost:5173"] -->|"published 5173:8080"| C
    subgraph net["Compose network (internal)"]
        C["client<br/>nginx-unprivileged :8080<br/>static React build + security headers"]
        A["api<br/>Node 22 :5000 (HTTPS)<br/>TRUST_PROXY=1"]
        M[("mongo<br/>replica set rs0<br/>:27017")]
        K["certs<br/>one-shot: self-signed cert<br/>SAN localhost, api"]
        C -->|"/api over HTTPS<br/>cert verified"| A
        A -->|"mongodb://mongo:27017/?replicaSet=rs0"| M
        K -. "certs volume (read-only)" .-> C
        K -. "certs volume (read-only)" .-> A
    end
    S["seed (on demand)<br/>creates the admin"] -.-> M
```

**1. Create the root `.env`** (next to `docker-compose.yml`; it's
gitignored). Compose refuses to start without `JWT_SECRET`.

PowerShell:

```powershell
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
notepad .env   # paste the value after JWT_SECRET=, set ADMIN_PASSWORD (12+ characters)
```

bash:

```bash
cp .env.example .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 48)/" .env   # or paste one by hand
nano .env   # set ADMIN_PASSWORD (12+ characters)
```

**2. Build and start** (same command in PowerShell and bash, from the repo
root):

```bash
docker compose up -d --build --wait
docker compose ps
```

`--wait` returns once everything is healthy. `docker compose ps` should
show `mongo`, `api` and `client` as `Up ... (healthy)` and `certs` as
`Exited (0)`, which is correct for a one-shot step. The first build takes a
few minutes.

**3. Create the admin account** (once; running it again changes nothing):

```bash
docker compose run --rm seed
```

**4. Open the app** at **http://localhost:5173**. Register, log in, create
gigs and book them exactly as with `npm run dev`. The API and MongoDB are
not reachable from the host on purpose. Everything goes through the
client at port 5173.

**5. Smoke test** (needs Node 22 on the host, no packages):

```bash
node docker/smoke-test.mjs
```

It checks that the page is served with a CSP header, that `/api/health`
works through the proxy, and that register, login, a protected route (200
with a token, 401 without) and an admin-only route (403 for a client) all
behave. It exits non-zero on any failure. It creates one
`test-smoke-...@example.com` user each run; registration is limited to 10
per hour per IP, so don't run it more often than that against the normal
stack.

**Logs, stopping and resetting**

```bash
docker compose logs -f api      # follow the API log (login, booking, transaction events)
docker compose down             # stop and remove the containers, keep the data
docker compose down -v          # also delete the database and the certificate (full reset)
```

**What the containers do**

| Service | Image | Notes |
|---|---|---|
| `certs` | `docker/certs` (Alpine 3.24.4 + OpenSSL) | Runs once and creates a self-signed cert (SAN `localhost`, `api`, `127.0.0.1`) in the `certs` volume. Keeps an existing cert unless it expires within a day |
| `mongo` | `mongo:8.0.34-noble` | Single-member **replica set** `rs0`, because bookings and their transactions are saved in one MongoDB transaction, which a standalone server doesn't support. The healthcheck initiates the set the first time and only reports healthy once it is primary. Not published to the host; it has no authentication, so it must stay internal |
| `api` | `api/Dockerfile` (Node 22.23.4 Alpine) | `NODE_ENV=production`, HTTPS with the shared cert, `CLIENT_ORIGIN=http://localhost:5173`, `TRUST_PROXY=1`. Not published to the host |
| `client` | `client/Dockerfile` (Vite build, then `nginx-unprivileged` 1.31.7) | Serves the build on 8080 (published as 5173) with the same security headers as `npm run preview`, and proxies `/api` to the API |
| `seed` | the API image | Only runs when you call `docker compose run --rm seed`. The `ADMIN_*` values exist only in this short-lived container |

**Security measures in the Docker setup**

- **Non-root everywhere.** The api runs as `node` (uid 1000), nginx as uid
  101, mongo as uid 999 and the cert step as uid 1000. Every service also
  has `cap_drop: [ALL]`, `no-new-privileges`, a **read-only root
  filesystem** (with a small `tmpfs` at `/tmp` only), `init: true`, a
  restart policy and a healthcheck. The API's own files are owned by root,
  so the running process can't modify them.
- **No secrets in images.** Both `.dockerignore` files are allowlists, so
  `.env`, `certs/*.pem`, keys, tests, Postman files and the host's
  `node_modules` never enter the build context. Secrets come from the root
  `.env` at runtime, and the cert is mounted read-only. `docker history`
  and a file listing of each image show no secret values and no key files.
- **One CSP.** The client's CSP and security headers are defined once in
  `client/securityHeaders.js`. Vite uses it for the `<meta>` tag and
  `npm run preview`, and the Docker build generates nginx's `add_header`
  lines from it. A Vitest test fails if nginx, preview and the shared file
  ever disagree. nginx also sets `server_tokens off`, caches only hashed
  `/assets/` files (one year, immutable), sends `index.html` with
  `no-cache`, and falls back to `index.html` for React Router paths.
- **TLS between nginx and the API is verified.** nginx proxies `/api` over
  HTTPS with `proxy_ssl_verify on`, trusting only the shared self-signed
  cert, whose SAN includes `api`. It passes `Host`, `X-Forwarded-For` and
  `X-Forwarded-Proto`.
- **Rate limiting behind the proxy.** Without help, every request would
  appear to come from the nginx container, so the per-IP login and register
  limits would become one global limit for all users. The API therefore
  reads `TRUST_PROXY` (unset means off, so `npm run dev` behaves exactly as
  before). Compose sets it to `1`: Express trusts exactly one proxy hop and
  takes the client address that nginx added to `X-Forwarded-For`. This is
  only safe because the API port is **not published**: if untrusted
  clients could reach the API directly, they could send a fake
  `X-Forwarded-For` and pick their own rate limit bucket. Values like
  `true` are refused for the same reason. Unit tests
  (`api/test/trustProxy.test.js`) show that with `TRUST_PROXY=1` two
  different forwarded addresses get separate buckets, that without it they
  share one, and that express-rate-limit logs no validation warnings with
  the Compose setting.
- **Fails fast.** The API exits at startup with a clear message if
  `JWT_SECRET` or `MONGO_URI` is missing (or if `JWT_SECRET` is shorter
  than 32 characters in production), instead of failing at the first
  login.
- **Health check outside the limits.** `GET /api/health` returns
  `{ "success": true, "data": { "status": "ok" } }` and nothing else. It is
  registered before the rate limiters, so healthchecks can't use up a
  limit, and it isn't written to the request log.

**Using MongoDB Atlas instead.** Set `MONGO_URI` in the root `.env` to your
Atlas connection string. The local mongo container still starts but isn't
used.

**Running Newman against the containers (test only).**
`docker-compose.test.yml` is a test-only override. It publishes the API on
`127.0.0.1:5000` (loopback only) and applies the same relaxed rate limits
as `npm run start:test`. The API ignores the `RATE_LIMIT_*_MAX` overrides
when `NODE_ENV=production`, so the override sets `NODE_ENV=test`. Other
effects of that: stack traces of unexpected errors go to the server log,
the `JWT_SECRET` length check is skipped and `clean:test` may run. Never use
it for a real deployment.

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build --wait
docker compose run --rm seed     # once, for the admin tests
cd api
npx newman run postman/HustleHub_API.postman_collection.json --insecure \
  --env-var base_url=https://localhost:5000 \
  --env-var admin_email=<ADMIN_EMAIL> --env-var admin_password=<ADMIN_PASSWORD>
cd ..
# remove the test users afterwards (allowed because NODE_ENV=test here)
docker compose -f docker-compose.yml -f docker-compose.test.yml run --rm --no-deps api node scripts/cleanTestData.js
# back to the normal stack (API no longer published)
docker compose up -d --wait
```

In PowerShell, put the Newman command on one line (or end each line with a
backtick instead of `\`). If port 5000 is already taken, for example by
`npm run dev`, set `$env:API_TEST_PORT = "5001"` (PowerShell) or
`export API_TEST_PORT=5001` (bash) before `up`, and use
`base_url=https://localhost:5001`.

**Docker troubleshooting**

| Problem | Fix |
|---|---|
| `required variable JWT_SECRET is missing a value` | There's no root `.env`, or `JWT_SECRET=` is empty. See step 1. The root `.env` is separate from `api/.env` |
| `Bind for 0.0.0.0:5173 failed: port is already allocated` | Something is already on 5173, usually `npm run dev`. Stop it (Ctrl+C) and run `up` again. On Windows, `Get-NetTCPConnection -LocalPort 5173` shows the process |
| Port 5000 in use (test override only) | Stop `npm run dev` / `start:test`, or use `API_TEST_PORT` as described above |
| `Cannot connect to the Docker daemon` / `open //./pipe/dockerDesktopLinuxEngine` | Docker Desktop isn't running. Start it and wait until it says "Engine running" |
| `dependency failed to start: container hustlehub-mongo-1 is unhealthy`, or the API logs `MongoDB connection failed` | The replica set wasn't ready in time (slow first start). Run `docker compose up -d --wait` again: the healthcheck initiates the set on its own. Check with `docker compose logs mongo`. `docker compose down -v` resets it completely |
| Booking fails with a server error | MongoDB isn't running as a replica set. Use this Compose file (it starts `--replSet rs0`) or Atlas, not a standalone mongo |
| `exec /usr/local/bin/generate-certs: no such file or directory`, or `/bin/sh^M` | Windows line endings in a script. `.gitattributes` forces LF for shell scripts, Dockerfiles, `*.conf` and `*.yml`. If your clone predates it, run `git rm --cached -r . -q && git reset --hard` (this discards uncommitted changes) or re-clone. The cert image also strips CRs while it builds |
| The browser shows an old version after a rebuild | Hard refresh (Ctrl+F5). `index.html` is never cached, but the browser may keep an old tab |
| `429 Too many requests` from the smoke test | It registers a user each run (limit 10 per hour per IP). Wait, run `docker compose restart api` (limits are in memory), or use the test override |

## 7. Troubleshooting

The problems below all came up while building and testing this project.

| Problem | Cause | Fix |
|---|---|---|
| The API exits with `MongoDB connection failed {"errorName":"Error","code":"ECONNREFUSED"}`, and the SRV lookup (`querySrv ECONNREFUSED`) fails, although Atlas is reachable | On some Windows networks Node can't resolve the DNS SRV record that a `mongodb+srv://` string needs | Use the **standard, non-SRV** connection string: in Atlas, Connect → Drivers, choose the older driver version / "Legacy URI String" option, which gives `mongodb://host1:27017,host2:27017,host3:27017/hustlehub?replicaSet=...&ssl=true&authSource=admin`. Add `/hustlehub` as the database name and put it in `MONGO_URI` |
| The API exits with `MongoDB connection failed` (other codes) | Wrong user or password, or your IP isn't allowed | Check the database user and password, and add your current IP under Atlas **Network Access** |
| The API logs `No SSL certificate found in api/certs - falling back to plain HTTP`; the client shows errors and Vite logs `EPROTO ... wrong version number` (`502`); Newman fails | `api/certs/key.pem` and `cert.pem` don't exist, so the API runs on HTTP while the proxy and Postman expect HTTPS | Run `npm run certs` in `api/` and restart the API |
| Every save, login or booking in the browser fails with **"Origin not allowed"** (`403`) | The client isn't on `http://localhost:5173`, the only origin `CLIENT_ORIGIN` allows (for example, preview or dev ended up on another port) | Run the client on port 5173 (both `npm run dev` and `npm run preview` use it), keep `CLIENT_ORIGIN=http://localhost:5173` with no trailing slash, and use `http://localhost:5173`, not `127.0.0.1` |
| `Port 5173 is already in use` (Vite) | Another dev or preview server is running. Both refuse to switch ports, because any other port would fail CORS | Stop the other one (Ctrl+C in its terminal) and start again |
| `EADDRINUSE: address already in use :::5000` (API) | Another copy of the API is still running | Stop it. To find it: Windows `netstat -ano \| findstr :5000` then `taskkill /PID <pid> /F`; macOS/Linux `lsof -i :5000`. Don't just change `PORT`: the client proxy and the Postman collections expect 5000 |
| `429 Too many requests, please try again in N seconds` while testing repeatedly | The strict limits are working (5 failed logins per 15 min, 10 registrations per hour, 10 bookings per 10 min) | Start the API with `npm run start:test` (relaxed limits, refused in production) for repeated manual or Newman testing. The counters live in memory, so restarting the API also clears them |
| Bookings fail with a `500` on a local MongoDB | A standalone MongoDB doesn't support the transaction that writes the booking and its transaction record together | Use Atlas, or run the local MongoDB as a single-node replica set (see **Getting a MONGO_URI**) |

## 8. Using the App

**Screens by role**

| Role | Screens |
|---|---|
| Anyone | Home, Register (client or freelancer only), Log in |
| Client | Browse gigs (search, category, price range, pages), Gig detail with **Book this gig** and a simulated payment confirmation, My bookings, My transactions, Account |
| Freelancer | Browse gigs, My gigs (New, Edit, Activate/Deactivate, Delete with confirmation), New/Edit gig form, Bookings on my gigs, Income (total, booking count, per-booking table), an **Edit** link on their own gig pages, Account |
| Admin | Browse gigs, Users (name, email, role, joined), All transactions (paginated), **Audit log** (paginated, filter by action), **Delete as admin** on any gig page, Account |

Every role has an **Account** page: change password (current, new and
confirm, with inline validation) and **Sign out of all devices** (with a
confirmation step). See [Extra security features](#extra-security-features).

A logged-out visitor who opens a protected page is sent to Log in; a
logged-in user with the wrong role sees a "Not allowed" page. These are
conveniences only - the API enforces every rule itself.

Deleting a gig (owner or admin) shows the API's own message, because a gig
that already has bookings is deactivated instead of deleted.

**How the client handles API text.** The API HTML-escapes free text before
saving it (so `<b>` is stored as `&lt;b&gt;`). The client decodes exactly
those entities for display (`utils/text.js`) and React renders the result
as plain text. The edit gig form also decodes the stored text into its inputs
and sends back exactly what the freelancer typed, so the API escapes it once
and text never double-escapes (no `&amp;amp;`). Nothing is ever rendered as HTML: there is no
`dangerouslySetInnerHTML` and no HTML strings are built, so a gig titled
`<img src=x onerror=alert(1)>` shows up as those literal characters.

**Session.** Only the JWT is stored, in `localStorage` (see the trade-off under
**Security**). On start-up the client checks it with `GET /api/auth/me`; if the
API later answers `401`, the token is cleared and the user is sent to the
login page. The client never logs tokens or request data. Every token carries
a version number; changing the password or signing out of all devices ends
every older token (see **Extra security features**).

The client's Content-Security-Policy is described under **Security → Client
Content-Security-Policy**, and its tests under **Testing → Frontend tests**.

## 9. API

All routes are under `https://localhost:5000` (the client reaches them through its `/api` proxy). "Logged in" means a valid `Authorization: Bearer <token>` header. Every response is `{ "success": true, "data": ... }` or `{ "success": false, "error": "..." }`.

### Roles and access control

Every user has exactly one role. It's stored on the user record in MongoDB,
and `protect` reads it from the database on each request rather than
trusting the token, so a role change takes effect immediately.

| Role | How you get it | What it can do |
|---|---|---|
| `client` | Default at registration | Browse gigs, book gigs, view their own bookings and transactions |
| `freelancer` | Choose it at registration | Create, edit and delete their **own** gigs, view bookings on their gigs, view their income |
| `admin` | Only via `npm run seed:admin` | List all users, view all transactions, remove any gig, read the audit log |

Every role can change its own password and sign out of all its devices
(`/api/auth/change-password`, `/api/auth/logout-all`). Nobody can change
another user's password.

Registration only accepts `client` or `freelancer`. Sending
`"role": "admin"` is rejected with a `400`, so nobody can make themselves an
admin through the API.

Routes are restricted with `requireRole(...)`. A user with the wrong role
gets a generic `403` that doesn't say which role would have been allowed, and
the attempt is logged (user id, role, method and path). All `/api/admin`
routes require both a valid token and the admin role.

**Ownership rule.** Being the right role isn't enough to change a record: you
also have to own it. `requireOwnership` loads the record by its id, returns
`404` if it doesn't exist and `403` if its owner isn't the logged-in user.
The owner is always compared against the user from the verified token and
database lookup, never against an id sent in the request body or query
string. Admins only bypass this on routes that explicitly allow it. Malformed
ids are rejected with a `400` by `validateObjectId` before they reach the
database.

### Endpoints

| Method | Path | Who can call it | Notes |
|---|---|---|---|
| GET | `/api/health` | Anyone | Health check |
| POST | `/api/auth/register` | Anyone | `role` may be `client` (default) or `freelancer`, never `admin`. Rate limited |
| POST | `/api/auth/login` | Anyone | Same generic `401` for a wrong password, an unknown email and a locked account. Rate limited per IP, plus the per-account lockout |
| GET | `/api/auth/me` | Logged in | The current user |
| POST | `/api/auth/change-password` | Logged in | Body `{ currentPassword, newPassword }` only. Wrong current password: `400`. Success: new token, every other session ends. Rate limited per user |
| POST | `/api/auth/logout-all` | Logged in | No body. Ends every session of the account, this one included |
| GET | `/api/admin/users` | Admin | All users, newest first, no password hashes |
| GET | `/api/admin/transactions` | Admin | All transactions, newest first. Query: `page`, `limit` (max 50) |
| DELETE | `/api/admin/gigs/:id` | Admin | Removes any gig: deleted if it has no bookings, otherwise deactivated. Recorded in the audit log |
| GET | `/api/admin/audit-logs` | Admin | The audit log, newest first. Query: `page`, `limit` (max 50), `action` (one of the audit actions). Read only |
| GET | `/api/gigs` | Logged in | Active gigs, newest first. Query: `page`, `limit` (max 50), `category`, `q`, `minPrice`, `maxPrice` |
| GET | `/api/gigs/mine` | Freelancer | Your own gigs, including inactive ones |
| GET | `/api/gigs/:id` | Logged in | One gig. Inactive gigs are only visible to their owner (404 for everyone else) |
| POST | `/api/gigs` | Freelancer | Creates a gig owned by you |
| PUT | `/api/gigs/:id` | Freelancer, **owner only** | Update `title`, `description`, `price`, `category`, `deliveryDays`, `isActive` |
| DELETE | `/api/gigs/:id` | Freelancer, **owner only** | Deletes the gig, or deactivates it if it already has bookings |
| POST | `/api/bookings` | Client | Body is `{ "gigId": "..." }` only. Creates the booking and its transaction, returns a simulated payment confirmation. Rate limited per user |
| GET | `/api/bookings/mine` | Client, Freelancer | Clients: their bookings. Freelancers: bookings on their gigs. Newest first |
| GET | `/api/bookings/:id` | The booking's client or freelancer | Anyone else gets `403` |
| GET | `/api/transactions/mine` | Client, Freelancer | Clients: what they paid. Freelancers: what they were paid |
| GET | `/api/income` | Freelancer | `{ totalEarned, bookingCount, items }` from completed transactions |
| GET | `/api/income/tax-estimate` | Freelancer | Estimated SA income tax for one tax year, with a monthly breakdown. Query: `taxYear` (optional, the year the tax year starts in). See [Tax estimation](#tax-estimation) |

**Gig rules**

- The owner of a gig is always the logged-in freelancer (`req.user.id`).
  Sending `freelancer`, `isActive` or any other field that isn't allowed
  is rejected with a `400`, not silently ignored.
- Text fields (title, description, category) are trimmed, length-checked
  and HTML-escaped before they're saved, so markup can't run in a browser
  later. Price must be a number from 1 to 100000 (at most 2 decimals),
  delivery days a whole number from 1 to 90, and category one of
  `design`, `writing`, `development`, `marketing`, `video`, `other`.
- Search (`q`) is plain text: regex characters are escaped, so `.*` only
  matches the literal text `.*`.
- Updating or deleting someone else's gig returns `403` and is logged.
  A gig with bookings is deactivated instead of deleted so booking and
  transaction history keeps a valid reference.

### Booking and transaction flow

1. **The client books a gig.** `POST /api/bookings` takes only a `gigId`.
   Any other field (price, freelancer, client, status) is rejected with a
   `400`. The client is the logged-in user, and the gig must exist and be
   active, otherwise the response is `404`.
2. **The booking is created.** The freelancer and the price come from the
   gig in the database, never from the request. The booking stores a
   snapshot of the gig's title and price, so if the freelancer edits the
   gig later, existing bookings keep what was actually booked.
3. **The transaction is created in the same database transaction.** The
   booking and its transaction record are written together using a MongoDB
   transaction (a Mongoose session with `withTransaction`). If anything
   fails part-way, neither is saved, so a booking can never exist without
   its transaction. Each booking has exactly one transaction (enforced by a
   unique index). Payment is simulated: the transaction is marked
   `completed`, gets a unique reference such as `TXN-20261009-9F3A1C2B7D4E`,
   and the response includes a payment confirmation with that reference.
4. **Income is computed from completed transactions.** `GET /api/income`
   adds up the logged-in freelancer's transactions with status `completed`
   (refunded ones are left out) and lists each one with its booking, gig
   title, amount, date and reference.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant UI as React client
    participant API as Express API
    participant DB as MongoDB Atlas

    C->>UI: Book this gig, then Confirm booking
    UI->>API: POST /api/bookings with only gigId and the Bearer token
    API->>DB: protect - verify JWT, load user and role
    DB-->>API: user (role client)
    Note over API: requireRole(client), booking rate limit per user,<br/>validator rejects any field except gigId
    API->>DB: start session, withTransaction
    API->>DB: find gig (inside the transaction)
    alt gig missing or inactive
        DB-->>API: none or inactive
        API->>DB: abort - nothing is saved
        API-->>UI: 404 Gig not found
    else gig is active
        API->>DB: insert Booking (client from token, freelancer, title and price from gig)
        API->>DB: insert Transaction (amount, completed, TXN reference)
        API->>DB: commit - both saved, or neither
        API-->>UI: 201 booking, transaction, simulated payment confirmation
        UI-->>C: Booking confirmed, reference TXN-...
    end
```

Money is stored as a plain number rounded to 2 decimal places, and totals
are rounded the same way, so amounts like 19.99 add up exactly. Booking
creation, transaction creation and failed booking attempts are all logged.

### Tax estimation

Freelancers get an estimate of the South African income tax on what they
earned through HustleHub+, on the **Income dashboard** (`/income`) and from
`GET /api/income/tax-estimate`. It is a planning aid, not tax advice: the
API returns a disclaimer with every estimate and the dashboard shows it
next to the figures.

**How the estimate is calculated**

1. **Gross income.** All of the freelancer's `completed` transactions
   whose date falls in the selected tax year are added up (refunded ones
   are left out). This total is treated as taxable income.
2. **Sliding scale.** Each slice of that income is taxed at its bracket's
   rate: the first R245 100 at 18%, the next slice up to R383 100 at 26%,
   and so on. The sum is the *tax before rebate*.
3. **Primary rebate.** The primary rebate (R17 820 for the 2027 tax year)
   is subtracted. The result is never allowed to go below zero, so anyone
   earning the tax-free threshold (R99 000) or less pays R0.
4. **Summary figures.** Take-home = gross − estimated tax. Effective rate =
   estimated tax ÷ gross × 100 (0% when gross is 0).

**Tax tables used**

The brackets, rebate and threshold come from the SARS page
[Rates of Tax for Individuals](https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/),
checked on 7 November 2026. They live as data in
[`api/src/config/tax.js`](api/src/config/tax.js), with the source and date
in a comment.

| `taxYear` | Period | SARS name | Primary rebate | Tax-free threshold (under 65) |
|---|---|---|---|---|
| `2026` (current) | 1 March 2026 to 28 February 2027 | 2027 tax year | R17 820 | R99 000 |
| `2025` | 1 March 2025 to 28 February 2026 | 2026 tax year | R17 235 | R95 750 |
| `2024` | 1 March 2024 to 28 February 2025 | 2025 tax year | R17 235 | R95 750 |
| `2023` | 1 March 2023 to 29 February 2024 | 2024 tax year | R17 235 | R95 750 |

SARS lists the 2025 and 2026 tax years as "no changes", so those two use
the 2024 tax year's brackets. 2027 tax year brackets (the current year):

| Taxable income (R) | Rate of tax (R) |
|---|---|
| 0 to 245 100 | 18% of taxable income |
| 245 101 to 383 100 | 44 118 + 26% of taxable income above 245 100 |
| 383 101 to 530 200 | 79 998 + 31% of taxable income above 383 100 |
| 530 201 to 695 800 | 125 599 + 36% of taxable income above 530 200 |
| 695 801 to 887 000 | 185 215 + 39% of taxable income above 695 800 |
| 887 001 to 1 878 600 | 259 783 + 41% of taxable income above 887 000 |
| 1 878 601 and above | 666 339 + 45% of taxable income above 1 878 600 |

The calculator works the tax out bracket by bracket rather than copying
SARS's fixed amounts, and a unit test checks that this gives exactly the
SARS base amount (44 118, 79 998, ...) at the bottom of every bracket, and
that tax at the threshold equals the rebate. That catches a typo in the
config.

**Worked example** (the same numbers are asserted in
[`api/test/taxCalculator.test.js`](api/test/taxCalculator.test.js)):
a freelancer earns **R300 000** in the 2027 tax year.

| Step | Calculation | Amount |
|---|---|---|
| First bracket | 18% × R245 100 | R44 118.00 |
| Second bracket | 26% × (R300 000 − R245 100) = 26% × R54 900 | R14 274.00 |
| Tax before rebate | R44 118 + R14 274 | R58 392.00 |
| Less primary rebate | R58 392 − R17 820 | **R40 572.00 estimated tax** |
| Take-home | R300 000 − R40 572 | **R259 428.00** |
| Effective rate | R40 572 ÷ R300 000 × 100 = 13.524% | **13.52%** |

**Money and dates**

- Amounts are summed as whole cents in the database query, and the
  calculator works in integer cents and hundredths of a cent, so there is
  no floating point drift. The total tax is rounded to the cent once,
  half up, at the end. Breakdown lines are rounded on their own for
  display, so in rare cases they can differ from the total by a cent.
  Every amount in the response is a number with at most 2 decimals.
- A tax year runs from 1 March to the last day of February. Its start and
  end, and the monthly buckets, are worked out in South African time
  (UTC+02:00, no daylight saving), so a booking at 00:30 on 1 March counts
  in the new tax year even though it is still 28 February in UTC.
- Without `taxYear`, the API uses the tax year containing today. If the
  tables for a new tax year haven't been added to `config/tax.js` yet, it
  falls back to the newest year that is configured. It never guesses rates.

**Assumptions and limitations**

- Resident individual **under 65**: only the primary rebate is applied
  (no secondary or tertiary rebate).
- **No deductions**: no business expenses, retirement fund contributions
  or medical scheme credits.
- **No UIF**, provisional tax payments, or income from outside HustleHub+.
- **Income to date is treated as the whole year's taxable income.** It is
  not projected forward, so early in the tax year the estimate is low.
- Only the tax years in the table above are supported. Any other
  `taxYear` gets a `400`.

**The endpoint**

`GET /api/income/tax-estimate?taxYear=2026` runs protect →
requireRole(freelancer) → query validation. The freelancer is always taken
from the verified token, never from the request. Clients and admins get
`403`, no token gets `401`. `taxYear` must be a single 4-digit year that is
in the table, and any other query parameter (for example `freelancerId`)
is rejected with `400` by `checkExact`. The query uses the existing
`{ freelancer, status, createdAt }` index on transactions, and each request
is logged as an `INCOME` event with the user id and tax year only. The
general API rate limiter applies. Response (`data`):

```json
{
  "taxYear": { "label": "1 March 2026 to 28 February 2027 (SARS 2027 tax year)", "start": "2026-03-01", "end": "2027-02-28" },
  "totals": { "gross": 300000, "taxBeforeRebate": 58392, "estimatedTax": 40572, "takeHome": 259428, "effectiveRatePercent": 13.52 },
  "rebate": 17820,
  "taxFreeThreshold": 99000,
  "breakdown": [{ "from": 0, "to": 245100, "ratePercent": 18, "amountInBracket": 245100, "tax": 44118 }, "... 7 brackets, the top one has to: null"],
  "monthly": [{ "month": "2026-03", "income": 0, "bookings": 0 }, "... all 12 months, March to February"],
  "assumptions": ["Resident individual under 65, so only the primary rebate applies.", "..."],
  "disclaimer": "This is an estimate for planning only, not tax advice and not a SARS assessment. ...",
  "source": { "name": "SARS - Rates of Tax for Individuals", "url": "https://www.sars.gov.za/...", "checkedOn": "2026-11-07" },
  "availableTaxYears": [2026, 2025, 2024, 2023]
}
```

**The dashboard** (`client/src/pages/Income.jsx`) has a tax year selector,
four summary cards (total earned, estimated tax, take-home, effective
rate), a monthly income bar chart, the tax-by-bracket table with the
rebate, an assumptions and disclaimer panel, and the existing per-booking
income table. The chart (`components/MonthlyIncomeChart.jsx`) is
hand-drawn SVG with no chart library, so the strict client CSP
(`style-src 'self'`, no `'unsafe-inline'`) needed no change. It uses only
SVG attributes and CSS classes, no inline styles and no
`dangerouslySetInnerHTML`. It has an `aria-label` summary, and the same
figures are in a visually hidden table for screen readers.

**Tests:** `api/test/` (run with `npm test` in `api/`, Node's built-in test
runner, no database or secrets needed) covers the calculator, tax-year
dates, config consistency and the response builder. The Newman **Income**
folder covers the endpoint (200 with values, 403 for client and admin,
401 without a token, 400 for a bad `taxYear` or an unknown parameter).
`Income.test.jsx` and `MonthlyIncomeChart.test.jsx` cover the dashboard.

## 10. Security

Security is layered: every request passes through several independent
checks, so a gap in one is caught by another.

**All authentication, authorisation and ownership checks are enforced by the
API.** Every rule (who is logged in, which role may call a route, who owns a
gig or a booking, which fields a request may set) is checked by the server on
every request. The React client only hides what a user can't use: hiding a
button or a page is a convenience, not security, and calling the API
directly with Postman or curl gets exactly the same `401`/`403`/`400`
responses.

### Route audit

Every route and its middleware, read from the running Express app. Every
request also passes the global pipeline first (Helmet, CORS, the general
rate limit, body parsing with a 10kb cap, the NoSQL sanitiser).

| Method | Route | Middleware, in order | Who |
|---|---|---|---|
| GET | `/api/health` | - | Anyone |
| POST | `/api/auth/register` | registerLimiter → validators (role only client/freelancer) | Anyone |
| POST | `/api/auth/login` | loginLimiter → validators | Anyone |
| GET | `/api/auth/me` | protect | Logged in |
| POST | `/api/auth/change-password` | protect → passwordChangeLimiter (per user) → validators (exact fields) | Logged in (own account only) |
| POST | `/api/auth/logout-all` | protect → validators (empty body) | Logged in (own account only) |
| GET | `/api/admin/users` | protect → requireRole(admin) | Admin |
| GET | `/api/admin/transactions` | protect → requireRole(admin) → pagination validators | Admin |
| DELETE | `/api/admin/gigs/:id` | protect → requireRole(admin) → validateObjectId | Admin |
| GET | `/api/admin/audit-logs` | protect → requireRole(admin) → query validators (exact params) | Admin |
| GET | `/api/gigs` | protect → query validators (exact params) | Logged in |
| GET | `/api/gigs/mine` | protect → requireRole(freelancer) | Freelancer (own gigs only, by query) |
| GET | `/api/gigs/:id` | protect → validateObjectId (+ inactive gigs only for the owner, in the controller) | Logged in |
| POST | `/api/gigs` | protect → requireRole(freelancer) → body validators (exact fields) | Freelancer (owner = token user) |
| PUT | `/api/gigs/:id` | protect → requireRole(freelancer) → validateObjectId → **requireOwnership** → body validators | Owner only |
| DELETE | `/api/gigs/:id` | protect → requireRole(freelancer) → validateObjectId → **requireOwnership** | Owner only |
| POST | `/api/bookings` | protect → requireRole(client) → bookingLimiter (per user) → validators (gigId only) | Client |
| GET | `/api/bookings/mine` | protect → requireRole(client, freelancer) | Own bookings only, by query |
| GET | `/api/bookings/:id` | protect → validateObjectId → **requireOwnership** (client or freelancer) | The booking's two parties |
| GET | `/api/transactions/mine` | protect → requireRole(client, freelancer) | Own transactions only, by query |
| GET | `/api/income` | protect → requireRole(freelancer) | Own income only, by query |
| GET | `/api/income/tax-estimate` | protect → requireRole(freelancer) → validators (`taxYear` only, checkExact) | Own income only, by query |

Every route except health, register and login requires a valid JWT; every
role-restricted route uses `requireRole`; every route that reads or changes
one specific gig or booking validates the id and checks ownership (or, for
reading a gig, that it is active or yours). The "mine" routes never take an
id from the request: they filter by `req.user.id`.

### Authentication and passwords

Registration (`POST /api/auth/register`) accepts a name, email, and
password. Before anything is stored, the password is hashed using
**bcryptjs** with a salt round factor of 10, so the plain-text password is
never written to storage, logged, or included in any API response. Login
(`POST /api/auth/login`) re-hashes the submitted password using the same
algorithm and compares it against the stored hash; the two are never
compared as plain text.

We chose `bcryptjs` (a pure JavaScript implementation) over the native
`bcrypt` package specifically to avoid `bcrypt`'s native-compilation
dependency chain, which pulled in several high/critical npm audit
vulnerabilities in build tooling unrelated to our own code. `bcryptjs`
exposes an identical API (`hash()`, `compare()`) with no native build step,
which also simplifies setup for every team member regardless of OS.

Duplicate registrations are rejected with a generic `409` response, and
failed logins (wrong password or unknown email) both return the same
generic `"Invalid email or password"` message and status code. This is
deliberate: distinguishing between "wrong password" and "no such account"
would let an attacker enumerate valid registered emails.

Passwords are hashed with **bcryptjs** (10 salt rounds) and never stored,
logged or returned. The hash field is excluded from every query by default.
Login always runs a bcrypt comparison, against a dummy hash when the email
doesn't exist, so an unknown email takes as long as a wrong password and
response times can't be used to find valid accounts. Both cases return the
same `401 Invalid email or password`.

### JWT and roles

On successful registration or login, the API issues a JSON Web Token
containing only the user's `id` and `role` in its payload, never the
password hash or other sensitive fields, since a JWT payload is signed but
not encrypted and can be decoded by anyone holding the token.

Every route except the health check, register and login is wrapped in a
`protect` middleware that:

1. Reads the token from the `Authorization: Bearer <token>` header
2. Verifies its signature against `JWT_SECRET`
3. Loads the user from the database, confirming they still exist and
   taking their role from the database rather than the token
4. Attaches the authenticated user to `req.user` for the controller to use

Missing, expired, or tampered tokens all return the same generic `401`
response. The JWT secret is read from an environment variable
(`process.env.JWT_SECRET`) and is never hard-coded in source or committed
to the repository.

A deleted user's token stops working straight away, because `protect` loads the user on every request.

### RBAC and ownership

- `requireRole(...)` restricts each route to the roles in the API table.
  A wrong role gets a generic `403` that doesn't say which role was needed.
- `requireOwnership(...)` loads the record and checks the logged-in user
  owns it (a gig's freelancer; a booking's client or freelancer), comparing
  against the user from the token and database, never an id from the request.
  Missing records are `404`, someone else's are `403`.
- Price, freelancer, client and status on a booking always come from the
  database and the token, never the request.
- Admins can't self-register; the one admin account is created by
  `npm run seed:admin`.

### Validation and sanitising

- **Validation (express-validator).** Every route that accepts input has a
  rule set. Types are checked with `typeof` (so an array or object can't
  slip through as a string), lengths and ranges are enforced, categories and
  roles come from fixed lists, and ids must be exactly 24 hex characters.
  Unknown fields are rejected with a `400` rather than ignored, so a
  request can't set `freelancer`, `price`, `role` or `isActive` by adding
  them to the body.
- **HTML escaping.** Every free-text field that other users see (gig title,
  description and category, and the user's name) is trimmed and
  HTML-escaped before it's saved, so `<script>` is stored as
  `&lt;script&gt;` and can't run in a browser.
- **NoSQL operator stripping.** A global middleware (express-mongo-sanitize)
  removes any key starting with `$` or containing `.` from the body, query
  string and route params before any route runs, so `{ "$gt": "" }` can
  never reach a Mongoose query. This is defence in depth on top of the
  validators, which already reject such input.
- **Search** text is escaped before it's used in a regex, so `.*` matches
  only the literal text `.*`.
- **Body limits.** Request bodies are capped at 10kb (`413`), and malformed
  JSON gets a clear `400`.

### Error handling

Invalid input is rejected with a `400` that lists the validation failures,
before any controller or database code runs.

All errors (validation failures, authentication failures, or unexpected
exceptions) pass through a single centralised error handler
(`middleware/errorHandler.js`). This handler:

- Logs the error to the server console only (stack traces only for
  unexpected errors, and never in production)
- Returns a generic, safe message to the client for any non-operational
  (unexpected) error
- Never includes a stack trace, file path, or configuration value in any
  client-facing response

Every error has the same shape, `{ "success": false, "error": "<message>" }`.
Real responses from the running API:

| Situation | Status | `error` message |
|---|---|---|
| Unknown route (`GET /api/nope?token=abc`) | `404` | `Route not found: GET /api/nope` (the query string is never echoed back) |
| Malformed id (`GET /api/gigs/not-an-id`) | `400` | `Invalid id` |
| Gig that doesn't exist | `404` | `Gig not found` |
| No token / tampered token | `401` | `Not authenticated - no token provided` / `Not authenticated - invalid or expired token` |
| Wrong password **or** unknown email | `401` | `Invalid email or password` (identical for both) |
| Client calling an admin route | `403` | `You do not have permission to perform this action` (doesn't say which role is needed) |
| Malformed JSON body | `400` | `Request body is not valid JSON` |
| Body over 10kb | `413` | `Request body is too large` |
| Request from another origin | `403` | `Origin not allowed` |
| Operator object in the login email | `400` | `Must be a valid email address` |
| 6th failed login in 15 minutes | `429` | `Too many requests, please try again in 899 seconds.` |
| Any unexpected server error | `500` | `Something went wrong. Please try again later.` |

The full error, with its stack trace in development only, goes to the
server log, never to the client.

### Rate limiting

| Limiter | Applies to | Limit | Counted per |
|---|---|---|---|
| Login | `POST /api/auth/login` | 5 **failed** attempts per 15 minutes (successful logins don't count) | IP |
| Register | `POST /api/auth/register` | 10 per hour | IP |
| Booking | `POST /api/bookings` | 10 per 10 minutes | Logged-in user (IP if none) |
| General | Everything under `/api` | 100 per 15 minutes | IP |

Going over a limit returns `429` with a `Retry-After` header and
`{ "success": false, "error": "Too many requests, please try again in N seconds." }`.
The standard `RateLimit` and `RateLimit-Policy` headers are sent; the legacy
`X-RateLimit-*` headers are off. Every hit is logged with the limiter name
and IP.

For local testing, each limit's max can be raised with `RATE_LIMIT_LOGIN_MAX`,
`RATE_LIMIT_REGISTER_MAX`, `RATE_LIMIT_BOOKING_MAX` and
`RATE_LIMIT_GENERAL_MAX` (`npm run start:test` does this). These overrides are
**ignored when `NODE_ENV` is `production`**, so the strict values above
always apply in a deployed API.

### Security headers (Helmet)

Helmet is configured explicitly. The API's Content-Security-Policy is built
from scratch, with no `unsafe-inline` or `unsafe-eval` anywhere:

| Directive | Value |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'self'` |
| `style-src` | `'self'` |
| `img-src` | `'self' data:` |
| `connect-src` | `'self'` and `CLIENT_ORIGIN` |
| `object-src` | `'none'` |
| `frame-ancestors` | `'none'` |
| `base-uri` | `'self'` |
| `form-action` | `'self'` |

Also set: `Strict-Transport-Security` (1 year, including subdomains),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`,
`Cross-Origin-Resource-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`. `X-Powered-By` is removed.

### Client Content-Security-Policy

The built React app has its own CSP, again with no `unsafe-inline` or
`unsafe-eval`:

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;
connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'
```

- **Built app:** a small Vite plugin (`client/vite.config.js`) adds it to
  `dist/index.html` as a `<meta http-equiv="Content-Security-Policy">` tag at
  build time. The build produces one script file and one stylesheet, both
  same-origin, with no inline scripts, inline styles or event handler
  attributes, so nothing has to be loosened. The app also never uses inline
  `style` attributes, and all API calls go to the same origin (`/api`).
- **`npm run preview`:** serves the same policy as a real response header,
  plus `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer` and `X-Frame-Options: DENY`.
  `frame-ancestors` only works as a header - browsers ignore it in a meta
  tag - which is why it's only in the preview headers. A production host
  should send the same headers.
- **`npm run dev` has no CSP on purpose.** The Vite dev server injects inline
  scripts for hot module reloading, which this policy would (correctly) block.
  Use `npm run build` + `npm run preview` to see the app under the real policy.

### CORS

CORS is locked to the single origin in `CLIENT_ORIGIN`, never a wildcard.
Only `GET`, `POST`, `PUT` and `DELETE` and only the `Authorization` and
`Content-Type` headers are allowed. A request or preflight from any other
origin gets a generic `403 Origin not allowed` with no
`Access-Control-Allow-Origin` header, and is logged. Requests with no
`Origin` header (Postman, curl, server-to-server) aren't cross-origin
browser requests, so CORS doesn't apply to them.

### HTTPS

The API is served over HTTPS using a locally generated, self-signed SSL
certificate (`api/certs/cert.pem`, `api/certs/key.pem`). `server.js` reads these
files and starts an `https` server rather than plain `http`. See
`api/certs/README.md` for exact instructions to regenerate the certificate,
since certificate/key files are excluded from git via `.gitignore` and must
be generated locally by anyone cloning the repository. HTTPS matters even
in local development because it's the same code path that will run in
production; testing over plain HTTP would hide any issues specific to a
TLS connection.

### Logging and monitoring

**Why we log.** The security controls in this section (the lockout, rate
limits, RBAC, ownership checks, validation) block attacks one request at a
time. Logging lets us see the pattern behind those requests: one IP
guessing passwords, one account under attack, a user trying other people's
records, a spike in errors. It also shows whether each control actually
fires. So the API writes one structured record for every security and
business event and one access line for every request. It then ships them
to a cloud logging platform (**Axiom**), where they can be searched,
charted and turned into email alerts.

#### How it works

- **One logger.** Every log line goes through `api/src/utils/logger.js`
  (`logger.info/warn/error`, and `logger.event(NAME, message, fields)` for
  catalogue events). Nothing calls `console.log` directly.
- **Every record has the same fields:**
  - always: `timestamp`, `level`, `event`, `message`,
    `service` (`hustlehub-api`) and `env`
  - during a request: `requestId`, `ip`, `method`, `path` (never the query
    string), plus `userId` and `role` once the token is verified
  - the event's own safe fields, for example `reason`, `limiter`, `route`,
    `status`, `durationMs`, `amount`
- **Two console formats** (`LOG_FORMAT`). `pretty` is the readable line
  used in development, for example
  `[time] [EVENT:AUTH_LOCKOUT] Account locked after too many failed attempts {...} (req 3f2a9c1b)`.
  `json` is one JSON record per line, the default when
  `NODE_ENV=production` and in Docker.
- **Access log.** One `HTTP_REQUEST` line per request when the response
  finishes. It records the method, path, status, duration and user, and
  never headers, bodies or query strings. Levels: 5xx is `error`, 4xx is
  `warn`, everything else `info`. The health check (polled by Docker every
  few seconds) and CORS preflights are skipped.
- **Crashes and shutdown.** An unhandled promise rejection is logged and
  the server carries on. An uncaught exception is logged, the queue is
  flushed (at most 2 seconds), and the process exits with code 1. On
  `SIGTERM` (Docker stop) or `SIGINT` (Ctrl+C), queued records are sent
  first. The shipper then prints its own counts (`Cloud log shipping
  summary`), to the console only.

#### Event catalogue

The names are stable (`api/src/utils/logEvents.js`), because the saved
queries and monitors search for them. A unit test checks that every
`logger.event()` call in the code uses a catalogue name.

| Event | When it fires | Key fields | Why it matters / what it helps detect |
|---|---|---|---|
| `AUTH_REGISTER` | An account is created, or refused because the email exists (`warn`) | `outcome`, `reason`, `userId`, `role`, masked `email`, `ip` | Mass sign-ups (bots), email enumeration attempts |
| `AUTH_LOGIN_SUCCESS` | A correct login | `userId`, `role`, `ip` | Account takeover: a login from an unusual IP right after many failures |
| `AUTH_LOGIN_FAILURE` | Any failed login | `reason` (`bad_credentials` or `locked`, internal only), masked `email`, `userId` if the account exists, `ip` | **Brute force** and **password spraying** (many failures per IP, or one IP against many accounts). The response is always the same generic 401 |
| `AUTH_LOCKOUT` | The 5th wrong password in 15 minutes locks the account | `userId`, `failedAttempts`, `lockMinutes`, `ip` | A targeted attack on one account. Also proves the lockout works |
| `AUTH_PASSWORD_CHANGED` | A password change succeeds (every other session ends) | `userId`, `ip` | Account takeover: an unexpected change is a red flag |
| `AUTH_PASSWORD_CHANGE_FAILED` | Wrong current password, or a locked account | `reason`, `userId`, `ip` | Someone with a stolen session trying to take over the account |
| `AUTH_LOGOUT_ALL` | "Sign out of all devices" | `userId`, `ip` | A user reacting to a suspected stolen session |
| `ACCESS_DENIED` | A 401 from `protect` (no, invalid, expired or revoked token, user gone), a 403 for the wrong role or not the owner, or a blocked CORS origin | `reason`, `status`, `route` (the route pattern, for example `/api/gigs/:id`), `userId`/`role` when known | **Privilege abuse** (a client calling freelancer or admin routes), **IDOR probing** (`not_owner`), stolen or forged tokens, use of a token after a password change |
| `RATE_LIMIT_EXCEEDED` | Any limiter answers 429 | `limiter` (`login`, `register`, `booking`, `passwordChange`, `general`), `ip`, `route`, `retryAfterSeconds` | Brute force, **booking spam or fraud**, scraping, denial-of-service attempts |
| `VALIDATION_FAILED` | A request fails validation, schema checks or body parsing | `source`, **field names only** (never values), `reason` | Fuzzing and injection attempts, broken clients |
| `INPUT_SANITIZED` | `$` or `.` operator keys were stripped from the input | `location` (body/query/params), `ip` | **NoSQL injection** attempts. Normal clients never send these |
| `GIG_CREATED` / `GIG_UPDATED` / `GIG_DELETED` | A freelancer changes their own gig | `gigId`, `price`, `fields`, `deactivated` | Who changed what and when (for example a price hiked after bookings) |
| `BOOKING_CREATED` | A booking is saved | `bookingId`, `gigId`, `clientId`, `freelancerId`, `price` | **Booking fraud** (bursts from one client), business volume |
| `BOOKING_FAILED` | A booking was refused or rolled back (nothing saved) | `gigId`, `reason` | Attempts to book hidden or deleted gigs, database trouble |
| `TRANSACTION_CREATED` | The (simulated) payment record for a booking | `reference`, `amount`, `transactionId`, `bookingId`, `clientId`, `freelancerId` | Income tracking. The count must match `BOOKING_CREATED` |
| `ADMIN_ACTION` | An admin lists users or transactions, views the audit log, or removes a gig, and when the admin is seeded | `action`, `gigId`, `count` | **Privilege abuse by an admin**: admins are powerful, so every admin read is logged too |
| `AUDIT_WRITE_FAILED` | An audit log entry could not be saved (the action still succeeded) | `action`, `errorName` | A gap in the audit trail. Should never happen |
| `ERROR_UNHANDLED` | A 5xx, an unhandled rejection or an uncaught exception | `errorName`, `errorMessage`, `status`, `source` | **Outages** and bugs: database down, crashes. Never includes a stack trace |
| `SERVER_START` / `SERVER_STOP` | The API starts listening / receives SIGTERM or SIGINT | `port`, `nodeEnv`, `logFormat`, `cloudLogging` (on, or why it is off) | Restarts and crash loops, and confirms the settings in use |
| `HTTP_REQUEST` | Every request (the access log) | `status`, `durationMs`, `method`, `path` | Error rates, slow routes, traffic spikes |
| `APP_LOG` | Plain `logger.info/warn/error` lines (startup settings, 4xx messages, database connection changes) | varies | Context around the events above |
| `LOG_TEST` | Only from `npm run log:test` | `source`, `test` | Confirms the connection to Axiom |

Real examples of every one, as they arrived at the receiver, are in
[`docs/logging-evidence/sample-events.jsonl`](docs/logging-evidence/sample-events.jsonl).

#### Request-id correlation

Every request gets a new id from `crypto.randomUUID()`. It is returned in
the `X-Request-Id` response header and stored in an `AsyncLocalStorage`
context, so **every** record written while that request is handled
carries the same `requestId`. That includes records from controllers,
middleware, the lockout code and the audit log helper. The middleware is
in `api/src/middleware/requestLogging.js`.

An `X-Request-Id` sent by the client is ignored. Otherwise a caller could
make its requests look like someone else's in the logs. Response bodies
are unchanged.

In practice, if a user reports an error, the id from the browser's network
tab, pasted into Axiom (query 7 in
[`axiom-queries.md`](docs/logging-evidence/axiom-queries.md)), shows
everything that happened in that request, in order.

#### Redaction rules

One scrubber (`api/src/utils/redact.js`) cleans every record **before**
it is printed and **before** it is shipped:

- **Sensitive keys.** The value under any key containing `password`,
  `token`, `secret`, `authorization`, `cookie`, `jwt`, `mongo_uri`,
  `api key`, `credential` and similar is replaced with `[REDACTED]`, at any
  depth and in any letter case.
- **Secrets inside text.** In any string, these become `[REDACTED_...]`:
  JWTs (`eyJ...`), Axiom tokens (`xaat-...`), `Bearer ...` values, and the
  `user:password@` part of connection strings such as `mongodb://`.
- **Emails** are masked in the existing style (`jane@example.com` becomes
  `j***@example.com`).
- **No stack traces.** An `Error` becomes `{ name, message }`, with no
  stack trace and no file paths.
- **Log injection.** CR, LF and other control characters become spaces, so
  input can't forge a fake log line.
- **Limits.** Strings are cut at 512 characters, nesting at 6 levels, and
  objects and arrays at 50 entries. Circular references are marked. A
  record over 16 KB keeps only its headline fields.
- **Never throws.** Anything the scrubber can't read becomes a placeholder.

On top of that, the code never passes passwords, tokens, request bodies,
headers or query strings to the logger in the first place.
`api/test/redact.test.js` has a unit test for each rule.

#### How logs reach Axiom

```mermaid
flowchart LR
  subgraph API["Express API (Node 22)"]
    RID["requestId middleware<br/>AsyncLocalStorage"] --> CODE["controllers and middleware<br/>logger.event(...)"]
    RID --> ACC["access log<br/>HTTP_REQUEST"]
    CODE --> LOG["utils/logger.js<br/>structured record"]
    ACC --> LOG
    LOG --> SCRUB["utils/redact.js<br/>scrubber"]
    SCRUB --> CON["console<br/>pretty or JSON lines"]
    SCRUB --> Q["utils/logShipper.js<br/>queue, max 1000"]
  end
  CON --> DOCKER["terminal or<br/>docker compose logs api"]
  Q -- "HTTPS POST /v1/ingest/hustlehub-api<br/>Bearer ingest-only token<br/>batches of up to 500, every 5 s" --> AX[("Axiom dataset<br/>hustlehub-api<br/>30 day retention")]
  AX --> STREAM["Stream and Query tabs<br/>APL queries"]
  AX --> MON["Monitors<br/>email alerts"]
  AX --> DASH["Dashboard"]
```

The shipper (`api/src/utils/logShipper.js`) uses Node's built-in `fetch`,
so it adds no new dependencies:

- **Batching.** It sends every 5 seconds, or as soon as 100 records are
  waiting, at most 500 per request, with a 5 second timeout.
- **Retries.** Network errors, timeouts, 5xx and 429 are retried with
  exponential backoff (0.5 s, then 1 s; 3 tries in all). Other 4xx are
  never retried, because a bad token won't fix itself.
- **A bounded queue.** It holds at most 1000 records. When full, the
  oldest are dropped and counted.
- **Never in the way.** Queuing is synchronous and cheap, the timers don't
  keep the process alive, and a failure never blocks or breaks a request.
- **Its own problems stay local.** Shipping problems are printed to the
  console at most once a minute, without the URL or token, and are never
  shipped, so a failing shipper can't feed itself.
- **Accounting.** It tracks the records `sent`, `ingested` and `failed`
  (from Axiom's reply), and `dropped` and `lost`.

#### Configuration

| Setting | Default | What it does |
|---|---|---|
| `LOG_FORMAT` | `pretty` in development, `json` when `NODE_ENV=production` and in Docker | Console format |
| `LOG_SHIPPING_URL` | empty (off) | `https://<edge-domain>/v1/ingest/<dataset>`. Must be `https` (plain `http` is accepted only to `localhost` in a test run) |
| `LOG_SHIPPING_TOKEN` | empty (off) | The Axiom API token. Secret: `.env` only, never committed, never logged |
| `LOG_SHIPPING_IN_TEST` | off | Set to `1` to ship from a test run anyway (for a demo) |

When shipping is on:

| Run | Ships to Axiom? |
|---|---|
| `npm run dev`, `npm start`, `docker compose up` with both `LOG_SHIPPING_*` set | **Yes** |
| Either setting empty (the default in both `.env.example` files, and in CI) | No: console only |
| `npm test`, `npm run start:test`, `npm run start:test:strict`, `NODE_ENV=test`, the Compose test override | No, unless `LOG_SHIPPING_IN_TEST=1` (the Compose test override forces it empty) |

So the Newman runs, the Vitest run, the unit tests and the CI pipeline
never fill the dataset with test data, and CI needs no new secrets. The
values reach the `api` container as **runtime** environment variables
only, never as build arguments. The token is never in an image layer, and
`.env` is in `.dockerignore`.

**Check the connection:** `cd api; npm run log:test` sends one labelled
`LOG_TEST` event. It prints only the HTTP status and Axiom's `ingested`
and `failed` counts, never the URL or the token. A 401 or 403 means the
token is wrong or can't write to the dataset. A 404 means the dataset
name or the domain is wrong.

#### Setting up Axiom (free Personal plan)

1. Sign up at axiom.co on the free **Personal** plan. It keeps data for
   30 days and allows 3 monitors and email notifiers.
2. Create a dataset named **`hustlehub-api`**.
3. Create the token in **Settings > API tokens > New API token**:
   - choose **Basic** (the type that can only ingest)
   - under **Dataset access**, select **only `hustlehub-api`**
   - click **Create** and copy the token (it is shown once)

   Never use a personal access token or a token with wider rights. If
   this token leaks, the worst anyone can do is write noise into one
   dataset: they can't read, query or delete anything.
4. Put the values in the gitignored `api/.env` (for `npm run dev`) and the
   root `.env` (for Docker):
   - `LOG_SHIPPING_URL=https://<edge-domain>/v1/ingest/hustlehub-api`,
     where the edge domain (for example US East 1) is shown under
     Settings > General
   - `LOG_SHIPPING_TOKEN=<the token>`
5. Run `npm run log:test` and expect `HTTP 200, ingested: 1, failed: 0`.
6. Paste the queries from
   [`docs/logging-evidence/axiom-queries.md`](docs/logging-evidence/axiom-queries.md)
   into the **Query** tab, and create the three suggested monitors.

If the token is ever exposed, regenerate it in Settings > API tokens and
update both `.env` files.

#### Personal data, retention and POPIA

What reaches Axiom, and why:

| Data | Why |
|---|---|
| User id (an opaque database id) and role | To tell which account a security event concerns without storing who the person is |
| Masked email (`j***@example.com`), only on failed logins and duplicate registrations | To spot attacks on an address that has no account yet (so no user id) without storing the address itself |
| IP address | The main signal for brute force, spraying and rate limit abuse |
| Method, path (no query string), status, timing | To see which routes are attacked, failing or slow |
| Booking and transaction ids, references and amounts | To trace income and spot booking fraud |

What never reaches it: names, full emails, passwords or hashes, tokens,
request and response bodies, headers, query strings and stack traces.

**Retention:** Axiom's free plan keeps data for **30 days** and then
deletes it. Console logs last as long as the terminal or the Docker
container.

**POPIA** (South Africa's Protection of Personal Information Act). IP
addresses and user ids linked to an account can identify a person, so
they count as personal information. The design follows these POPIA
conditions:

- **Purpose specification:** logs are used for security and operations
  only.
- **Minimality (section 10):** only the fields in the table above, with
  emails masked.
- **Retention:** 30 days.
- **Security safeguards (section 19):** an ingest-only token, HTTPS and
  redaction.

This is a student project, not a legal assessment. A real deployment
would also need:

- a privacy notice that tells users about this logging
- a written operator agreement with Axiom (sections 20 and 21)
- a check of the rules for sending personal information outside South
  Africa (section 72), because the dataset is hosted in the US
- a process for reporting a security compromise (section 22)

#### Do the controls work? What the logs show

| Control | Evidence in the logs | Axiom query |
|---|---|---|
| Account lockout | `AUTH_LOCKOUT` after the 5th wrong password, then `AUTH_LOGIN_FAILURE` with `reason: locked` for the correct password | 2 |
| Login and booking rate limits | `RATE_LIMIT_EXCEEDED` with the `limiter` name, and `HTTP_REQUEST` with status 429 | 4 |
| RBAC | `ACCESS_DENIED` `wrong_role` 403 (for example a client opening `/api/income`) | 3 |
| Ownership (no IDOR) | `ACCESS_DENIED` `not_owner` 403 on `/api/gigs/:id` | 3 |
| Session revocation | `AUTH_PASSWORD_CHANGED` or `AUTH_LOGOUT_ALL`, then `ACCESS_DENIED` `revoked_token` 401 for the old token | 3 (without the 403 filter) |
| Validation and NoSQL sanitising | `VALIDATION_FAILED` (field names) and `INPUT_SANITIZED` | add `where event == "INPUT_SANITIZED"` |
| CORS | `ACCESS_DENIED` `cors_origin` | 3 (without the 403 filter) |
| Booking integrity | `BOOKING_CREATED` and `TRANSACTION_CREATED` counts always match | 5 |
| Audit log | `AUDIT_WRITE_FAILED` count stays at 0 | 6 |
| Safe error handling | `ERROR_UNHANDLED` with the error name only (no stack trace), while the client gets a generic message | 6 |

Each of these was triggered and seen in the local mock check
([`mock-shipping-check.txt`](docs/logging-evidence/mock-shipping-check.txt)),
and a smaller set was shipped to the real Axiom dataset
([`live-shipping-check.txt`](docs/logging-evidence/live-shipping-check.txt)).

**Limitations:**

- **Best effort.** Shipping is best effort: during a long outage,
  records beyond the queue cap are dropped (and counted), and records
  still queued when the process is killed hard are lost. The console copy
  is always complete.
- **Trust.** The logs are only as trustworthy as the server that writes
  them. A compromised server could stop logging, which is why monitors
  that alert on *missing* data are worth adding.
- **Thresholds.** The monitor thresholds are guesses for a small project.
  They should be tuned against real traffic.

### Dependency audit

Results of `npm audit` at submission time:

| Project | `npm audit --omit=dev` (what ships) | `npm audit` (including dev tools) |
|---|---|---|
| `api/` | **0 vulnerabilities** | 3 high - all `braces`, dev-only (see below) |
| `client/` | **0 vulnerabilities** | **0 vulnerabilities** |

**Known and accepted:** the three `api/` findings are one issue in `braces`,
reached only through `nodemon` → `chokidar` → `braces`. nodemon is a
development tool that watches files and restarts the server; it never runs
in a deployed API and never handles requests. The only available fix
(`npm audit fix --force`) downgrades nodemon to 1.x, which is a breaking
change, so this is accepted for now. Newman is run with `npx` instead of
being a dependency, because its own dependency tree adds about 19 more
dev-only findings.

### JWT in localStorage: the trade-off

The React client keeps the JWT in `localStorage`, which is acceptable
for this POE but has a known risk: **any script running on the page can read
`localStorage`**, so a single XSS bug would let an attacker steal the token
and act as the user until it expires. An `httpOnly` cookie would hide the
token from scripts, but brings CSRF protection and cookie configuration
with it.

The risk is reduced by:

- **Escaping on the way in:** all user-supplied text is HTML-escaped
  before it's stored.
- **React's default escaping on the way out:** JSX escapes values when it
  renders them, and the client never uses `dangerouslySetInnerHTML` or builds
  HTML strings (checked by a test with an `<img onerror>` title).
- **A strict CSP on the client and the API:** `script-src 'self'` with no
  `unsafe-inline` or `unsafe-eval` blocks injected inline scripts and scripts
  from other origins, even if markup did get in.
- **Short-lived tokens:** tokens expire after 1 hour (`JWT_EXPIRES_IN`).
- **The role isn't trusted from the token:** a stolen token can't be used to
  gain more rights than the user already has.

### Security review summary

| Concern | How it's addressed |
|---|---|
| Plain-text password storage | Never stored: hashed with bcryptjs before persisting |
| Credential stuffing / enumeration | Identical generic error and timing for wrong password, unknown email and locked account; failed logins rate limited (5 per 15 min per IP) and accounts locked after 5 failures in 15 min (see **Extra security features**) |
| Unauthorised access to protected routes | JWT required and verified on every protected request |
| Token tampering | Signature verification via `JWT_SECRET`; invalid signatures rejected |
| Stolen or leaked session token | Token versions: changing the password or signing out of all devices ends every older token |
| Unreviewable admin and security actions | Append-only audit log of admin gig removals, password changes, sign-outs and lockouts, visible to admins |
| Injection / malformed input | express-validator rejects invalid input and unknown fields; global middleware strips `$` and `.` keys |
| Cross-site scripting | Text fields HTML-escaped before saving; strict CSP with no `unsafe-inline` |
| Privilege escalation / IDOR | Role read from the database on every request; RBAC on every route; ownership checks on gigs and bookings |
| Brute force and abuse | Rate limits on login, register and booking, plus a general limit across the API |
| Cross-origin abuse | CORS locked to `CLIENT_ORIGIN`; other origins get a `403` and no CORS headers |
| Clickjacking and MIME sniffing | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |
| Information leakage via errors | Centralised error handler strips stack traces/internals from all client responses |
| Data interception in transit | API served over HTTPS, even in local development |

### Extra security features

Three features added on top of the core security controls above. Each one
can be seen in the app and is covered by unit, Newman and (where there is a
UI) Vitest tests.

#### A. Account lockout

**Threat.** Slow password guessing against **one** account from **many** IP
addresses (a botnet, or credential stuffing spread out over time). The
per-IP login limiter can't see this, because every IP only tries a few
times.

**How it works.**
- **Policy:** 5 failed attempts within 15 minutes lock the account for 15
  minutes. Failures older than the window don't count, and a successful
  login resets everything. The policy lives in
  [`api/src/config/lockout.js`](api/src/config/lockout.js).
  `LOCKOUT_MAX_ATTEMPTS`, `LOCKOUT_WINDOW_MINUTES` and
  `LOCKOUT_DURATION_MINUTES` can change it for local testing only; they are
  ignored when `NODE_ENV=production`, like the rate limit overrides.
- **State:** `failedLoginAttempts`, `firstFailedLoginAt` (the start of the
  window), `lastFailedLoginAt` and `lockUntil` on the user. They are
  `select: false`, removed by `toJSON` from every response, and never put
  in the JWT. Accounts created before this feature simply don't have them,
  which counts as "no failures", so no migration is needed.
- **Atomic counting:** every attempt on an existing account first *claims*
  an attempt with one `findOneAndUpdate`. It only matches an unlocked
  account and uses an update pipeline to count the attempt (or start a new
  window) and set `lockUntil` on the attempt that reaches the limit, all
  inside the database. The password is only checked after a successful
  claim. With 10 wrong passwords sent in parallel against a fresh account,
  exactly 5 were checked, 5 were refused unchecked, and the account locked
  once.
- **No enumeration, by message or by timing:** a locked account never has
  its real password checked. A bcrypt compare against a dummy hash runs
  instead, exactly as it does for an unknown email. A wrong password, an
  unknown email and a locked account all return the **same** `401`
  `{"success":false,"error":"Invalid email or password"}`, byte for byte,
  and take about the same time.
- **Logging:** the lockout is logged as an `AUTH_LOCKOUT` event with the
  user id only (never the email or password) and written to the audit log.
  Later attempts on the locked account are `AUTH_LOGIN_FAILURE` with the
  internal reason `locked`.

**Two layers, two different threats.**

| Layer | Protects against | Limit |
|---|---|---|
| Per-IP login rate limiter | One IP bursting through passwords (one account or many) | 5 failed logins per 15 min per IP, then `429` |
| Account lockout | Many IPs slowly guessing one account | 5 failed attempts per 15 min per account, then locked 15 min |

Both are kept. They trip at the same count, so from a single IP with the
strict limits the 6th attempt gets the limiter's `429` before the lock
would show. To demonstrate the lock, run the API with
`npm run start:test`, which relaxes the per-IP limiter but keeps the
lockout strict. The Newman lockout requests run that way.

**The trade-off.** Anyone who knows an email address can lock that account
on purpose for 15 minutes by typing wrong passwords (a small denial of
service). That is why the lock is short and lifts by itself, with no admin
needed: it makes online guessing roughly 5 tries per 15 minutes per account
(about 480 a day instead of thousands a second), while a deliberately
locked-out user only waits 15 minutes. A permanent lock or a manual unlock
would hand that attacker a much stronger weapon.

**Files:** `api/src/config/lockout.js`, `api/src/utils/lockout.js` (pure
decision logic and the atomic update), `api/src/utils/accountLockout.js`
(the password check used by login and change-password),
`api/src/controllers/authController.js`, `api/src/models/User.js`.

**Tests:**
- `api/test/lockout.test.js`: 15 unit tests with a fixed clock, covering
  the window, expiry, reset on success, slow guessing and policy overrides.
- `api/test/userModel.test.js`: the fields never reach JSON.
- Newman **Account security**: a throwaway user, five wrong passwords, then
  the **correct** password is still rejected with exactly the same body as
  an unknown email.

**Limitations.** Counters live on the user document, so they are shared by
every API instance (unlike the in-memory rate limits). There is no
CAPTCHA or "unlock by email" step; the lock simply expires.

#### B. Change password and session revocation

**Threat.** A stolen or leaked token stays valid until it expires, and
before this feature nobody could change a password at all. A user who
suspected their account was compromised had no way to lock the attacker
out.

**How it works.**
- **Token versions:** every user has a `tokenVersion` (default 0), and
  every JWT carries it as `tv`. `protect` loads the user's current version
  on each request and rejects any token whose version doesn't match with
  the usual `401`. Tokens issued before this feature have no `tv`, and
  that counts as 0, so existing sessions and existing accounts (including
  the seeded admin) keep working with no migration.
- **`POST /api/auth/change-password`** with `{ currentPassword,
  newPassword }`:
  - `checkExact`, so any other field is a `400`, plus strict `typeof`
    checks.
  - The new password follows the registration rules (8+ characters, a
    number) and must differ from the current one.
  - **At most 72 bytes:** bcrypt silently ignores everything after 72
    bytes. Registration now enforces this too, in bytes, so an emoji counts
    as 4.
  - The current password is checked through the same lockout as login, so
    wrong current passwords count towards locking the account.
  - The new hash is saved with the shared helper and `tokenVersion` is
    incremented in the same update. The response carries a fresh token, so
    this session continues and every other session ends.
  - Rate limited to 5 per 15 minutes per user.
- **Wrong current password is a `400`, not a `401`.** The client treats a
  `401` as "session gone" and logs the user out, so a typo here must not
  return one. A locked account gets the same `400` and the same message.
- **`POST /api/auth/logout-all`** increments `tokenVersion`, so every token,
  the current one included, stops working at once.
- Both routes use `protect` and only ever act on the logged-in user. Both
  are logged (`AUTH_PASSWORD_CHANGED`, `AUTH_LOGOUT_ALL`) and written to
  the audit log.
- **The Account page** (`/account`, in the nav for every role) has the
  change-password form:
  - inline validation and `autocomplete="current-password"` /
    `"new-password"`
  - the stored token is replaced on success
  - clear success and generic error messages
  - the inputs are uncontrolled, so passwords never sit in React state, and
    the form is cleared after a change.

  It also has a **Sign out of all devices** button with a confirmation step;
  afterwards the login page says so.
- This also removes an old limitation: the seeded admin password could
  only be changed by editing the database. Now an admin changes it on the
  Account page like anyone else.

While building this, the login validator also got a `typeof` check. An
array sent as the password used to reach bcrypt and fail with a `500`; it
is now a `400`.

**Files:** `api/src/utils/generateToken.js` (`tv` in the token),
`api/src/middleware/authMiddleware.js`, `api/src/controllers/authController.js`,
`api/src/routes/authRoutes.js`, `api/src/middleware/validators.js`,
`client/src/pages/Account.jsx`, `client/src/context/AuthProvider.jsx`.

**Tests:**
- Unit: `tokenVersion.test.js` (token payload, missing `tv` counts as 0)
  and `authValidators.test.js` (field rules, unknown fields, the 72-byte
  limit counted in bytes).
- Newman **Account security**:
  - every validation failure is a `400`, and no token is a `401`
  - a wrong current password is a `400` and the session survives it
  - after a change, the **old** token gets `401` and the **new** one works
  - the old password no longer logs in and the new one does
  - after logout-all, the current and the earlier tokens are both `401`.
- The smoke test checks the change through the Docker stack.
- Vitest `Account.test.jsx` covers validation, success, the `400` error
  (no logout), the generic `500` message and the confirmation step.

**Limitations.** Every protected request already reads the user from the
database (for the role), so checking the version costs nothing extra. There
is no list of individual sessions, so you can sign out everywhere but not
one specific device. Changing a password doesn't email the user.

#### C. Admin audit log

**Threat.** Without a record, an admin's destructive actions and the
security events on accounts (lockouts, password changes, sign-outs) can't
be reviewed afterwards, so abuse or an account takeover goes unnoticed.
Logs alone are easy to lose and not visible in the app.

**How it works.**
- **Model:** a new `AuditLog` model ([`api/src/models/AuditLog.js`](api/src/models/AuditLog.js))
  stores `actorId`, `actorRole`, `action` (an enum), `targetType`,
  `targetId`, `outcome`, `ip`, `createdAt` and a small whitelisted `meta`
  object (`failedAttempts`, `lockMinutes`, `hadBookings`).
  - `strict: 'throw'` refuses any other field.
  - It never stores passwords, tokens, emails or request bodies.
  - Indexes: `createdAt` descending, and `action` + `createdAt`.
- **Append-only:** there is no route that updates or deletes entries, and
  the model throws on every update, replace and delete operation
  (`updateOne`, `findOneAndUpdate`, `deleteMany`, `bulkWrite`, re-saving a
  loaded entry, ...) before anything reaches the database.
- **What is recorded:** admin gig deletion and deactivation, password
  changed, sign out of all devices, and account locked.
- **Failure handling** ([`api/src/utils/audit.js`](api/src/utils/audit.js)):
  if an audit record can't be written, the failure is logged as an `ERROR`
  event (action and error type only, never the entry or the raw error
  message) and the request carries on. It isn't failed or undone, and
  nothing leaks to the client. The admin gig removal doesn't use a
  database transaction, so its audit entry is written straight after the
  removal succeeds.
- **`GET /api/admin/audit-logs`** (admin only, through the existing
  router-level guard):
  - paginated like the transactions list (default 20, max 50)
  - optional `action` filter, validated against the enum
  - `checkExact`, so any other query parameter is a `400`
  - actors shown by name and id only.
- **The admin "Audit log" page** (`/admin/audit-log`) has a table, an
  action filter and paging, in the same style as Users and Transactions.

**Files:** `api/src/models/AuditLog.js`, `api/src/utils/audit.js`,
`api/src/controllers/adminController.js`, `api/src/middleware/adminValidators.js`,
`api/src/routes/adminRoutes.js`, `client/src/pages/AdminAuditLog.jsx`.

**Tests:**
- Unit: `auditLog.test.js` (every append-only guard, the whitelist and the
  indexes), `audit.test.js` (a failed write is logged and never throws,
  without the raw error) and `adminValidators.test.js`.
- Newman, with admin credentials, finds each entry:
  - after the password change, the logout-all and the lockout (with
    `{ failedAttempts: 5, lockMinutes: 15 }`)
  - after the admin gig deletion.
- Newman also checks `403` for clients and freelancers, `401` with no token,
  and `400` for a bad `action` or an unknown parameter.
- Vitest: `AdminAuditLog.test.jsx` and `Layout.test.jsx` (who sees which
  link).

**Limitations.** Append-only is enforced by the application. Someone with
direct database access could still change entries; a real deployment
would add a database user without update and delete rights, or ship the
entries to write-once storage. Entries are kept forever, with no retention
policy.

## 11. Testing

The main Postman collection (`api/postman/HustleHub_API.postman_collection.json`)
starts with an **Auth** set covering valid and invalid scenarios:

- Health check
- Successful registration (+ automated checks that a token is returned and
  no password hash is leaked)
- Duplicate email registration (expects `409`)
- Invalid registration input (expects `400`)
- Successful login
- Login with wrong password (expects `401`, generic message)
- Login with unknown email (expects `401`, same generic message)
- Protected route with no token (expects `401`)
- Protected route with an invalid/tampered token (expects `401`)
- Protected route with a valid token (expects `200` and the authenticated user)

An **RBAC** folder checks access control on `/api/admin/users`:

- No token (expects `401`)
- Client token (expects `403`, generic message)
- Freelancer token (expects `403`, generic message)
- Registering with `"role": "admin"` (expects `400`, no token issued)
- Admin login and admin token (expects `200`, no password hashes, newest
  first). These two only run when admin credentials are supplied and are
  skipped cleanly otherwise.

A **Gigs** folder registers two fresh freelancers and a fresh client, then
checks:

- Freelancer creates a gig (`201`, owner is the token's user); client
  (`403`) and no token (`401`) can't
- Validation: negative price, empty title, and an unknown `freelancer` field
  in the body (all `400`)
- Browsing as a client (`200`, freelancer shown by name only, no emails or
  password hashes), regex characters in `q` treated as plain text
- Get by id (`200`), malformed id (`400`), unknown id (`404`)
- `/api/gigs/mine` returns only the caller's gigs
- Owner updates (`200`); another freelancer updating or deleting, and a
  client updating, are all `403`
- Owner deletes (`200`), after which the gig returns `404`

A **Bookings** folder registers a fresh client and two fresh freelancers,
then checks:

- The client books a gig (`201`): the price matches the gig, the freelancer
  and client come from the gig and the token, and the response includes the
  transaction and a payment confirmation with the same reference
- Sending `price`, `freelancer` or `status` in the body (`400`), a
  freelancer trying to book (`403`), no token (`401`)
- Malformed `gigId` (`400`), unknown `gigId` (`404`), inactive gig (`404`)
- `/api/bookings/mine` and `/api/transactions/mine` show the booking to
  the client and the gig's freelancer, but not to the other freelancer
- `GET /api/bookings/:id` works for both parties and is `403` for the
  other freelancer
- After the freelancer raises the gig price, the booking still shows the
  price it was booked at

An **Income** folder then checks that the gig's freelancer has
`totalEarned` equal to the booked price with one item, the other freelancer
has `0` and an empty list, a client gets `403` on `/api/income` and on
`/api/admin/transactions`, and (only when admin credentials are supplied)
the admin can list all transactions.

A **Security** folder checks:

- The CSP (`default-src 'self'`, `frame-ancestors 'none'`, no
  `unsafe-inline`), `nosniff`, `no-referrer` and HSTS headers are present,
  and `X-Powered-By` is absent
- An operator object in the login email and an operator in a query string
  are both rejected with `400`
- A request with `Origin: http://evil.example` gets `403` and no
  `Access-Control-Allow-Origin`; the client origin is allowed
- Malformed JSON gives `400` and an oversized body `413`, with no stack trace
- A client and a freelancer both get `403` on `DELETE /api/admin/gigs/:id`,
  and (only when admin credentials are supplied) the admin can delete the gig

Every run registers users with a fresh `test-...@example.com` email, so the
collection can be run repeatedly against the same database. Use
`npm run clean:test` to clear them out afterwards (it also removes
their gigs, bookings and transactions).

**Running the tests**

The main collection registers and logs in far more often than the strict
rate limits allow, so it runs against the API started with relaxed limits.
The rate limits themselves are proven by a separate collection that runs
against the strict defaults.

```bash
cd api

# 1. Main collection, against relaxed limits
npm run start:test          # terminal 1 (refuses to run in production)
npx newman run postman/HustleHub_API.postman_collection.json --insecure     # terminal 2

# 2. Rate limit collection, against the strict defaults
#    stop start:test, then start it with the strict limits (test runs never
#    ship logs to the cloud, so the Axiom dataset gets no test data)
npm run start:test:strict   # terminal 1
npx newman run postman/HustleHub_RateLimits.postman_collection.json --insecure    # terminal 2
```

`npx` downloads Newman on first use; `npm install -g newman` and then plain
`newman run ...` works too.

To include the admin tests in the main collection, pass the seeded admin's
credentials as variables (they're never stored in the collection):

```bash
npx newman run postman/HustleHub_API.postman_collection.json --insecure \
  --env-var admin_email=<ADMIN_EMAIL> --env-var admin_password=<ADMIN_PASSWORD>
```

The rate limit collection (`api/postman/HustleHub_RateLimits.postman_collection.json`)
proves that the 6th failed login in the window gets `429` with a
`Retry-After` header and a message whose number of seconds matches it, and
that the 11th booking by the same user gets `429`. Rate limit counters live
in memory, so restart the API before running it again to start with a clean
window.

Both collections can also be imported into Postman (disable SSL certificate
verification under Settings → General).

### Test evidence

Real output from fresh runs on 12 October 2026 is committed in
[`docs/test-evidence/`](docs/test-evidence/README.md) as plain text, alongside
screenshots of the same runs:

| Suite | How to run it | Result | Evidence |
|---|---|---|---|
| Main Postman collection (Newman) | API on `npm run start:test`, then `npx newman run postman/HustleHub_API.postman_collection.json --insecure` with the admin credentials | **85 requests, 145 assertions, 0 failed** (80 / 134 without admin credentials, when the 5 admin requests are skipped) | [`newman-main-results.txt`](docs/test-evidence/newman-main-results.txt), [screenshot 11](docs/screenshots/11-newman-pass.png) |
| Rate limit collection (Newman) | API freshly started with `npm run start:test:strict` (strict limits), then `npx newman run postman/HustleHub_RateLimits.postman_collection.json --insecure` | **20 requests, 26 assertions, 0 failed** | [`newman-rate-limits-results.txt`](docs/test-evidence/newman-rate-limits-results.txt), [screenshot 11b](docs/screenshots/11b-newman-rate-limits.png), [screenshot 14](docs/screenshots/14-rate-limit-429.png) |
| Frontend (Vitest + React Testing Library) | `npm run test:run` in `client/` | **16 files, 67 tests passed** | [`vitest-results.txt`](docs/test-evidence/vitest-results.txt), [screenshot 12](docs/screenshots/12-vitest-pass.png) |

### Frontend tests

The React client is tested with **Vitest** and **React Testing Library**
(jsdom). Tests sit next to the code they cover (`*.test.js` / `*.test.jsx`).
No test touches the network: the api modules (or `fetch`) are mocked, and the
setup file makes any unmocked `fetch` fail loudly.

```bash
cd client
npm run test:run   # run everything once
npm test           # watch mode while developing
```

There are 67 tests across 16 files, covering both rendering and user interaction:

- **Utilities:** `decodeEntities` (every entity the API produces, single-pass
  decoding), rand and date formatting, and the register and gig validation
  rules that mirror the API.
- **API client:** adds the Bearer header, unwraps `{ success, data }`, throws
  the server's error message, gives a generic message on a network failure or a
  non-JSON reply, passes on the 429 retry message, clears the session and calls
  the logout handler on a 401 (but not for a failed login), and refuses
  absolute URLs.
- **Register and Login:** inline errors for bad input; only client and
  freelancer are offered as roles; valid, trimmed data is submitted; the server's
  message on a duplicate email; the generic login error; the 429 retry message.
- **ProtectedRoute:** logged-out visitors go to login, the wrong role sees
  "Not allowed", the right role sees the page.
- **XSS:** a gig titled `<img src=x onerror=alert(1)>` (escaped, as the API
  stores it) renders as plain text in the gig card and on the gig page, and no
  `img` element is created.
- **Gigs page:** loading, list, empty and error (with retry) states; the
  search is debounced (fake timers prove there is no request per keystroke);
  the category filter changes the request; an invalid price range is blocked.
- **Gig detail by role:** clients see Book, the owner sees Edit, admins see
  Delete as admin and never Book.
- **Booking panel:** the confirmation shows the price and the simulated payment
  notice, Cancel closes it, a double click on Confirm books only once, success
  shows the transaction reference, and a 429 shows the retry message.
- **Gig form and edit page:** bad price and delivery days are blocked, price and
  delivery days are sent as numbers, the edit form is pre-filled with decoded
  text and saves the raw text (no `&amp;amp;`), and someone else's gig can't be
  edited.
- **My gigs:** activate/deactivate, a confirmation before deleting, and the
  server's message telling "deleted" apart from "deactivated".
- **Income** (totals, items, empty state with R 0,00) and **admin Users** (rows
  rendered, no password field anywhere).

### CI/CD pipeline

Every push to `main`, every pull request and every manual run
(**Run workflow**) goes through the GitHub Actions pipeline in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml). It tests the code,
runs several kinds of security checks, builds and starts the **whole
stack** in Docker, tests it end to end, and turns red if anything fails.

```mermaid
flowchart LR
    B["Backend<br/>unit tests + npm audit"]
    F["Frontend<br/>Vitest, lint, build + npm audit"]
    G["Secret scan<br/>gitleaks, full history"]
    L["Lint<br/>hadolint, compose config,<br/>actionlint, zizmor"]
    S["Stack<br/>build all images, compose up,<br/>smoke test, Newman x2"]
    I["Image scan<br/>Trivy images + Dockerfiles"]
    D["Dynamic scan<br/>OWASP ZAP baseline"]
    A["Static analysis<br/>ESLint + Semgrep"]
    OK{{"Pipeline OK"}}
    B --> S
    F --> S
    G --> S
    L --> S
    B --> D
    F --> D
    G --> D
    L --> D
    L --> I
    B --> OK
    F --> OK
    G --> OK
    L --> OK
    S --> OK
    I --> OK
    D --> OK
    A --> OK
```

The four fast jobs and the static analysis job run in parallel. The stack
and the ZAP scan only start when the four fast jobs pass, so nothing is
deployed or scanned on top of broken code. The image scan starts as soon as
the Dockerfiles have passed lint.

**What each job checks, and why it matters for security**

| Job | What it does | Why |
|---|---|---|
| **Backend - unit tests and npm audit** | `npm ci`, `npm test` (191 unit tests: tax calculator, startup settings check, trust proxy and rate limit buckets, health check, gig price validation, account lockout, token versions, audit log guards, log redaction, the structured logger, request ids and the cloud log shipper), `npm audit --omit=dev --audit-level=high` | Proves the money and security logic behaves, and that no known high or critical vulnerability ships in a production dependency |
| **Frontend - tests, build and npm audit** | `npm ci`, `npm run test:run` (110 Vitest tests, including the CSP and security header consistency test), `npm run lint`, `npm run build` (and checks the CSP meta tag is in the build), `npm audit --omit=dev --audit-level=high` | Same for the React app; a build without its CSP fails |
| **Secret scan - gitleaks (full history)** | gitleaks over **every commit** (`fetch-depth: 0`), not just the latest | A secret committed and later deleted is still in history; this catches it. No allowlist: the history scans clean |
| **Lint - Dockerfiles, Compose and workflows** | hadolint on all three Dockerfiles; `docker compose config` on both Compose files, plus a check that Compose **refuses** to run without `JWT_SECRET`; actionlint and zizmor on this workflow | Catches insecure or broken container and pipeline configuration before anything runs. zizmor is a security audit of the workflow itself (injection, credential persistence, unpinned actions) |
| **Stack - build, smoke test and Newman** | Generates random credentials, builds the certs, api and client images, `docker compose up -d --build --wait`, runs `docker/smoke-test.mjs`, the **rate limit** collection against the strict limits, seeds the admin, switches to the test override and runs the **main** collection (with the admin tests) | Proves the **entire stack** builds, starts healthy and enforces auth, RBAC, ownership, validation, rate limits, CORS and headers end to end |
| **Image scan - Trivy** | Trivy on the api, client and certs images (fails on HIGH/CRITICAL vulnerabilities that have a fix, `--ignore-unfixed`), and Trivy's Dockerfile misconfiguration scan | Known-vulnerable OS packages or libraries in the images, or risky Dockerfile patterns (root user, no healthcheck, ...), fail the build. There is no `.trivyignore` |
| **Dynamic scan - OWASP ZAP baseline** | Starts the stack and runs the ZAP baseline scan (spider plus passive scan) against `http://localhost:5173` | Tests the running app from the outside like an attacker would: missing or broken security headers, information leaks, cross-domain problems |
| **Static analysis - ESLint and Semgrep** | ESLint with eslint-plugin-security on `api/` and `client/` (`--max-warnings 0`), Semgrep with seven rule packs (`--error`). Uploads JSON and SARIF | Finds insecure code patterns in the source before it runs. See [Static code analysis](#static-code-analysis) |
| **Pipeline OK** | Runs last, always, and fails unless **every** job above succeeded | One check to require in branch protection |

The ZAP rules live in [`.zap/rules.tsv`](.zap/rules.tsv). Missing or
broken security headers (CSP, anti-clickjacking, nosniff,
Permissions-Policy, site isolation), information leaks (server version,
`X-Powered-By`, debug errors, source code), cross-domain problems and
vulnerable JavaScript libraries are set to **FAIL**. Everything else is
reported as a warning in the report but doesn't fail the job. One rule is
ignored: *ZAP is Out of Date* (10116), because the image is pinned on
purpose and updated by Dependabot. The first scan found two real problems,
both fixed rather than suppressed: no `Permissions-Policy` header and
missing cross-origin isolation headers. All of them are now sent from
`client/securityHeaders.js`, and nginx's `/healthz` sends them too. The
scan takes about a minute.

**How the pipeline itself is secured**

- The workflow token is read-only (`permissions: contents: read`), and
  `actions/checkout` runs with `persist-credentials: false`, so no step can
  push or reuse the token.
- Every action is pinned to a full commit SHA, with the version in a
  comment, and every tool image (gitleaks, hadolint, actionlint, zizmor,
  Trivy, ZAP) to a tag **and** a digest, so a moved tag can't change what
  runs.
- It triggers on `push`, `pull_request` and `workflow_dispatch` only (never
  `pull_request_target`). Branch names and PR titles are never put into a
  script. A newer run on the same branch cancels the older one.
- It needs **no repository secrets**.
  [`.github/scripts/make-ci-env.sh`](.github/scripts/make-ci-env.sh)
  generates a random `JWT_SECRET` (96 characters), admin email and admin
  password (35 characters) in each job, masks them with `::add-mask::`, and
  writes them to a job-local `.env` that disappears with the runner.
- Newman's full JSON report contains request bodies and the generated
  admin password, so it is never uploaded. Only the JUnit files and a slim
  JSON (request names, status codes, assertion results) are.

**How a failure is enforced**

- Every `run:` step uses bash with `-e -o pipefail`, so a failing command
  fails the step even when its output is piped through `tee`.
- There is no `continue-on-error` and no `|| true` anywhere.
- Unit tests, Vitest, Newman and smoke-test failures exit non-zero.
  `npm audit --audit-level=high`, gitleaks, Trivy (`--exit-code 1`),
  hadolint, actionlint, zizmor and ZAP FAIL rules all do the same.
- `Pipeline OK` needs every job and checks each one's result explicitly,
  so a failed, cancelled or skipped job turns it red.
- This was tested locally: a broken unit test assertion, the old lockfile
  with the body-parser advisory, and a broken health check response each
  made their step exit 1.

**Where to find the results**

- **Actions** tab → the run → **Summary**. Each job writes its key results
  there: unit test and Vitest counts, Newman requests and assertions for
  both collections, the gitleaks result, the Trivy result and the ZAP
  FAIL/WARN counts. `Pipeline OK` adds a table of every job's result.
- **Artifacts** at the bottom of the run summary: `newman-results` (JUnit
  and slim JSON for both collections, plus the smoke test output),
  `trivy-results` (one table per image plus the Dockerfile scan) and
  `zap-report` (HTML, JSON and Markdown report). They're kept for 14 days.
- If the stack job fails, it prints every container's log before it tears
  the stack down. Teardown (`docker compose down -v`) always runs.
- Saved evidence from a green run: [`docs/pipeline-evidence/`](docs/pipeline-evidence/README.md).

**Dependabot** ([`.github/dependabot.yml`](.github/dependabot.yml)) opens
weekly update pull requests for the npm packages in `api/` and `client/`,
the pinned actions, the three Dockerfiles' base images and the mongo image
in Compose. Every one of them goes through this pipeline before it can be
merged.

**Running every step locally** (from the repo root, with Docker running):

```bash
# Backend
cd api && npm ci && npm test && npm audit --omit=dev --audit-level=high && cd ..

# Frontend
cd client && npm ci && npm run test:run && npm run lint && npm run build && npm audit --omit=dev --audit-level=high && cd ..

# Secret scan (full history)
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.30.1 git --no-banner --redact --verbose --exit-code 1 /repo

# Lint
for f in api/Dockerfile client/Dockerfile docker/certs/Dockerfile; do docker run --rm -i hadolint/hadolint:v2.15.1 hadolint - < "$f"; done
JWT_SECRET=x docker compose config --quiet
JWT_SECRET=x docker compose -f docker-compose.yml -f docker-compose.test.yml config --quiet
docker run --rm -v "$PWD:/repo" --workdir /repo rhysd/actionlint:1.7.12 -color
docker run --rm -v "$PWD:/repo:ro" ghcr.io/zizmorcore/zizmor:1.32.0 --offline /repo/.github/workflows

# Image scan (after docker compose build)
for i in hustlehub-api:local hustlehub-client:local hustlehub-certs:local; do
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.76.2 image --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 "$i"
done
docker run --rm -v "$PWD:/repo:ro" aquasec/trivy:0.76.2 config --misconfig-scanners dockerfile --exit-code 1 /repo

# Stack (uses your root .env; see "Running with Docker")
docker compose up -d --build --wait
node docker/smoke-test.mjs
npx newman run api/postman/HustleHub_RateLimits.postman_collection.json --env-var base_url=http://localhost:5173
docker compose run --rm seed
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --wait
npx newman run api/postman/HustleHub_API.postman_collection.json --insecure --env-var base_url=https://localhost:5000 \
  --env-var admin_email=<ADMIN_EMAIL> --env-var admin_password=<ADMIN_PASSWORD>

# Static analysis (see "Static code analysis" below)
cd api && npm run lint && cd ..
cd client && npm run lint && cd ..
node .semgrep/run.mjs

# Dynamic scan (stack running; joins the Compose network, so it works the same on Windows)
mkdir -p zap-report && cp .zap/rules.tsv zap-report/
docker run --rm --network hustlehub_default -v "$PWD/zap-report:/zap/wrk:rw" zaproxy/zap-stable:2.17.0 \
  zap-baseline.py -t http://client:8080 -c rules.tsv -I -r zap-report.html

docker compose -f docker-compose.yml -f docker-compose.test.yml down -v
```

In PowerShell, use `${PWD}` instead of `$PWD`, run the `for` loops one
image or file at a time, and put each command on one line. Git Bash on
Windows needs `MSYS_NO_PATHCONV=1` in front of the `docker run` commands
that mount a folder. The rate limit collection runs through the client
(`http://localhost:5173`), exactly like the pipeline. It needs freshly
started counters, so run it before anything else after `up`.

### Static code analysis

Two static analysis tools read the source code (without running it) and
look for insecure patterns. Both run in the pipeline's **Static analysis -
ESLint and Semgrep** job and fail it on **any** finding. Both can be run
locally with the exact same configuration.

**The tools and why they were chosen**

| Tool | What it checks | Configuration |
|---|---|---|
| **ESLint 9** with [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security) | Runs on every `.js`/`.jsx` file in `api/` and `client/`, including tests and scripts. `@eslint/js` recommended rules catch bugs (undefined or unused variables, unreachable code). eslint-plugin-security catches Node security smells: `eval` with an expression, regular expressions that can backtrack catastrophically (ReDoS), `new RegExp` built from variables, file paths and `require` built from variables, timing-unsafe comparisons, `child_process` with variables, and dynamic object keys that could reach the prototype ("object injection"). In the client, eslint-plugin-react (including `react/no-danger` and `react/jsx-no-target-blank`) and eslint-plugin-react-hooks are also on | [`api/eslint.config.js`](api/eslint.config.js), [`client/eslint.config.js`](client/eslint.config.js) (flat config). `npm run lint` = `eslint . --max-warnings 0` |
| **Semgrep Community Edition 1.184.0** | Pattern and data-flow rules across the whole repository: JavaScript, Express and React code, but also nginx config, Dockerfiles, YAML and Markdown | Rule packs in [`.semgrep/rulesets.txt`](.semgrep/rulesets.txt): `p/javascript`, `p/nodejs`, `p/expressjs`, `p/react`, `p/owasp-top-ten`, `p/jwt`, `p/secrets` (152 rules in total). Runs from the pinned image `semgrep/semgrep:1.184.0` (tag and digest) through [`.semgrep/run.mjs`](.semgrep/run.mjs), so Windows needs no Python. Metrics are off and only the open-source engine is used (`--oss-only`) |

ESLint is the standard JavaScript linter and sits right in the editor, so
problems show up while typing. Semgrep adds rules ESLint doesn't have
(Express-specific injection and XSS sinks, hard-coded JWT secrets, leaked
keys) and also checks the non-JavaScript files. That's how it found both
of its real findings below. CodeQL was deliberately not used.

**What is excluded:** only installed packages, build output and the tools'
own result files ([`.semgrepignore`](.semgrepignore): `node_modules/`,
`client/dist/`, `coverage/`, the result folders and
`docs/static-analysis/`; ESLint ignores `node_modules/`, `dist/` and
`coverage/`). No source, test or script folder is excluded.

**Before and after**

The baseline was saved before any fix, in its own commit (`ad1025c`), in
[`docs/static-analysis/baseline/`](docs/static-analysis/baseline/). The
final run is in [`docs/static-analysis/final/`](docs/static-analysis/final/).

| Tool | Rule | Severity | Baseline | Final |
|---|---|---|---|---|
| ESLint (api) | `security/detect-object-injection` | warning | 12 | 0 |
| ESLint (api) | `no-unused-vars` | error | 2 | 0 |
| ESLint (api) | `security/detect-non-literal-fs-filename` | warning | 1 | 0 |
| ESLint (api) | `security/detect-non-literal-regexp` | warning | 1 | 0 |
| ESLint (api) | `security/detect-unsafe-regex` | warning | 1 | 0 |
| ESLint (client) | `react/prop-types` | error | 92 | 0 (rule off, see below) |
| ESLint (client) | `security/detect-object-injection` | warning | 9 | 0 |
| ESLint (client) | `security/detect-unsafe-regex` | warning | 2 | 0 |
| Semgrep | `dependabot-missing-cooldown` | MEDIUM | 5 | 0 |
| Semgrep | `nginx.security.request-host-used` | WARNING | 1 | 0 |
| **Total** | | | **126** (ESLint api 17, client 103, Semgrep 6) | **0** |

**What the findings meant, in plain language**

None of the 126 findings was an exploitable vulnerability in the running
app. Two were real configuration weaknesses, and a handful pointed at code
that was safe only because of a check somewhere else. Those were all
fixed. The rest were false positives: patterns that look dangerous in
general but are safe here because the key, path or pattern is fixed in our
own code. Each of those has a narrow suppression on that line with the
reason. The 92 `react/prop-types` errors were about a React feature that
no longer exists.

**Fixes**

| Finding | What was wrong | Fix | Commits |
|---|---|---|---|
| Semgrep `request-host-used` (`client/nginx.conf`) | nginx passed the browser's own `Host` header on to the API (`proxy_set_header Host $host`). The API doesn't build links from it today, but forwarding an attacker-chosen Host is the root of host header injection (poisoned password reset links, cache poisoning) | nginx now always sends `Host: api`, the API's own name in its certificate. A test fails if `$host` or `$http_host` ever comes back | `0434d24`, `8794a69` |
| Semgrep `dependabot-missing-cooldown` (×5, `.github/dependabot.yml`) | Dependabot would propose a version minutes after it was published. Hijacked or malicious package releases are usually caught and pulled within days, so that is the riskiest moment to upgrade | A 7-day cooldown on every ecosystem. Security updates are not delayed | `78639db` |
| `security/detect-unsafe-regex` (`api/src/middleware/gigValidators.js`, `client/src/utils/validation.js`) | The two-decimal price check `/^\d+(\.\d{1,2})?$/` has a quantifier inside an optional group, the shape that ReDoS attacks exploit. This one is actually linear, but the code relied on that being true | Rewritten as `/^(?:\d+\|\d+\.\d\d?)$/` (two plain alternatives, nothing nested), with new tests: the same prices are accepted and rejected, and a 300-digit input finishes at once | `bfd63c2`, `1f97b7e`, `5556e2e`, `9cc5abe` |
| `security/detect-object-injection` (`api/src/utils/taxEstimate.js`, `api/test/taxConfig.test.js`) | Tax tables were looked up with `TAX_TABLES[year]` on a plain object, so `buildTaxEstimate('constructor')` found `Object.prototype.constructor` (truthy) and only failed later. The query validator stopped this from being reachable, but the lookup itself wasn't safe | New `getTaxTable(year)` backed by a `Map`, so nothing inherited from `Object.prototype` can ever match. Tests try `__proto__`, `constructor`, `toString` and string or decimal years | `cd159c2`, `a288283`, `ae65b02` |
| `security/detect-object-injection` (`client/src/utils/text.js`) | The HTML entity decoder used `ENTITIES[entity]` on a plain object | A `Map` (`ENTITIES.get(entity)`); the existing decoder tests still pass | `e622071` |
| `security/detect-object-injection` (`client/src/pages/Gigs.jsx`, `client/src/test/taxEstimateFixture.js`) | Objects were filled with `obj[key] = value` in a loop (keys were fixed, so not exploitable) | Rewritten with `Object.fromEntries`, a `Map` and `Array.prototype.at`, so there is nothing to suppress | `ba78dcc`, `c158278` |
| `security/detect-object-injection` (`api/src/config/rateLimits.js`, 3 hits) | The env override was looked up twice and the result object filled by key | Each override is read once and the limits are built with `Object.fromEntries`. One lookup remains, suppressed (see below) | `e86ef1a` |
| `no-unused-vars` (`api/src/middleware/authMiddleware.js`) | An unused `err` in a `catch` | `catch {` | `6d60c90` |
| `react/prop-types` (×92, client) | The rule wants a `propTypes` declaration on every component. **React 19 removed propTypes checking**: React now ignores `propTypes` completely, so the declarations would never run. The rule is on only because eslint-plugin-react's recommended set predates React 19 | Turned off in `client/eslint.config.js` with the reason next to it. This is the **only** rule that is turned off, and it isn't a security rule. Every security, React and hooks rule stays on | `315b82d` |

**Remaining suppressions** (each one is `eslint-disable-next-line` for one
rule on one line, with the reason written after `--`):

| File | Rule | Why it is safe |
|---|---|---|
| `api/src/middleware/errorHandler.js` | `no-unused-vars` | Express only treats a middleware as an error handler when it has exactly four arguments, so the unused `next` must stay |
| `api/src/controllers/gigController.js` (`pick`) | `security/detect-object-injection` | The field names come from a fixed allow-list in the controller, never from the request |
| `api/src/controllers/gigController.js` (search) | `security/detect-non-literal-regexp` | Every regex character in `q` is escaped first (and `q` is at most 50 characters), so it is a literal text search |
| `api/src/middleware/ownership.js` | `security/detect-object-injection` | The owner field names (`freelancer`, `client`) are fixed in the route definitions |
| `api/src/config/rateLimits.js` | `security/detect-object-injection` | The env variable name comes from the fixed `STRICT_LIMITS` table |
| `api/scripts/startTest.js` | `security/detect-object-injection` | The key is one of the fixed `OVERRIDES` names (local test script) |
| `api/scripts/generateCerts.js` | `security/detect-non-literal-fs-filename` | The paths are the fixed OpenSSL locations listed in the script |
| `client/src/api/gigs.js` | `security/detect-object-injection` | The key is one of the fixed `LIST_PARAMS` names |
| `client/src/test/securityHeaders.test.js` | `security/detect-unsafe-regex` | Test-only: the regex runs once over our own `nginx.conf`, never on user input |

There are no Semgrep suppressions (`nosemgrep`), no `.eslintignore`, and
no rule set to `warn` or `off` apart from `react/prop-types`.
`security/detect-object-injection` keeps the plugin's default level.

Every one of the 21 `detect-object-injection` hits was reviewed:

| Hits | Location | Outcome |
|---|---|---|
| 3 | `api/src/config/rateLimits.js` | Restructured; 1 suppression left |
| 3 | `api/src/controllers/gigController.js` (one line) | Suppressed (fixed allow-list) |
| 2 | `api/src/middleware/ownership.js` (one line) | Suppressed (fixed field names) |
| 2 | `api/src/utils/taxEstimate.js` | Fixed (prototype-safe `getTaxTable`) |
| 1 | `api/test/taxConfig.test.js` | Fixed (`getTaxTable`) |
| 1 | `api/scripts/startTest.js` | Suppressed (fixed names) |
| 1 | `client/src/api/gigs.js` | Suppressed (fixed names) |
| 1 | `client/src/pages/Gigs.jsx` | Rewritten with `Object.fromEntries` |
| 6 | `client/src/test/taxEstimateFixture.js` | Rewritten with a `Map` and `.at()` |
| 1 | `client/src/utils/text.js` | Fixed (`Map`) |

**Proof that the job fails closed:** an `eval` of `req.query` plus a
hard-coded JWT secret was added to `api/src/app.js` for a moment (never
committed).
- `npm run lint` exited 1: `security/detect-eval-with-expression`.
- `node .semgrep/run.mjs` exited 1 with 3 findings: `hardcoded-jwt-secret`,
  `direct-response-write` (XSS) and `code-string-concat` (code injection).

After every class of fix, the api unit tests (74), Vitest (88 tests),
both Newman collections against the Docker stack (main: 94 requests and
173 assertions; rate limits: 20 and 26) and `docker/smoke-test.mjs` (12
checks) were re-run and passed.

**Running both tools locally** (PowerShell, from the repo root, Docker
Desktop running):

```powershell
# ESLint (fails on any warning or error)
cd api;    npm ci; npm run lint; cd ..
cd client; npm ci; npm run lint; cd ..

# Semgrep (pinned container; results in semgrep-results\semgrep.json and .sarif)
node .semgrep/run.mjs

# Counts by tool, rule and severity, after saving ESLint JSON next to Semgrep's
cd api;    npx eslint . -f json -o ..\semgrep-results\eslint-api.json; cd ..
cd client; npx eslint . -f json -o ..\semgrep-results\eslint-client.json; cd ..
node .github/scripts/static-analysis-summary.mjs semgrep-results
```

Clean output: `npm run lint` prints only the `> eslint . --max-warnings 0`
line and returns to the prompt. Semgrep ends with
`Ran 152 rules on ... files: 0 findings.` The first Semgrep run downloads
the image, and on Windows a full scan takes a few minutes because Docker
reads the files through the Windows file system.

## 12. Requirements Traceability

The 11 Part 2 requirements, what was built for each, where, and how it is tested.

| # | Requirement | What was built | Where in the code | How it is tested | Evidence |
|---|---|---|---|---|---|
| 1 | Full-stack MERN | React client, Express API, MongoDB via Mongoose | `client/`, `api/src/`, `api/src/models/`, `api/src/config/db.js` | Everything below runs against the real stack; fresh-clone run of every README command | All test evidence runs against the real stack (React, Express, MongoDB Atlas) |
| 2 | Gig management: freelancers manage only their **own** gigs | Create/read/update/delete gigs; owner always from the token; `requireOwnership` on update and delete; unknown body fields rejected | `api/src/controllers/gigController.js`, `routes/gigRoutes.js`, `middleware/ownership.js`, `middleware/gigValidators.js`; client `pages/MyGigs.jsx`, `pages/GigEditor.jsx`, `components/GigForm.jsx` | Newman **Gigs** folder (other freelancer and client get `403`, `freelancer` in the body is `400`); `MyGigs.test.jsx`, `GigEditor.test.jsx`, `GigForm.test.jsx` | Newman Gigs folder in [`newman-main-results.txt`](docs/test-evidence/newman-main-results.txt); [screenshot 5](docs/screenshots/05-my-gigs.png) |
| 3 | React frontend: register, log in, browse, book; invalid input handled; nothing sensitive in the UI | Pages per role, inline validation mirroring the API, API text decoded and rendered as text only, only the JWT stored | `client/src/pages/`, `client/src/components/`, `client/src/utils/validation.js`, `utils/text.js` | `Register.test.jsx`, `Login.test.jsx`, `Gigs.test.jsx`, `BookingPanel.test.jsx`, `GigCard.test.jsx` / `GigDetail.test.jsx` (XSS title renders as text) | [`vitest-results.txt`](docs/test-evidence/vitest-results.txt); screenshots [1](docs/screenshots/01-register.png), [2](docs/screenshots/02-login.png), [3](docs/screenshots/03-browse-gigs.png) |
| 4 | Clients book gigs; simulated payment; **every booking creates a transaction linked to both users** | `POST /api/bookings` takes only `gigId`; booking and transaction written together with `withTransaction`; one transaction per booking (unique index) | `api/src/controllers/bookingController.js`, `models/Booking.js`, `models/Transaction.js` | Newman **Bookings** folder; atomicity checked with a forced failure (no booking left behind) and 12 concurrent bookings (each with exactly one transaction) | Newman Bookings folder in [`newman-main-results.txt`](docs/test-evidence/newman-main-results.txt); screenshots [6](docs/screenshots/06-book-confirm.png), [7](docs/screenshots/07-booking-confirmed.png), [8](docs/screenshots/08-client-bookings.png), [10](docs/screenshots/10-admin-transactions.png) |
| 5 | Freelancers list gigs, see their bookings; income tracked per freelancer | `/api/bookings/mine` (bookings on their gigs), `/api/income` aggregation over completed transactions | `api/src/controllers/incomeController.js`, `bookingController.js`; client `pages/FreelancerBookings.jsx`, `pages/Income.jsx` | Newman **Income** folder (right freelancer, other freelancer gets 0); `Income.test.jsx` | Newman Income folder in [`newman-main-results.txt`](docs/test-evidence/newman-main-results.txt); screenshots [5](docs/screenshots/05-my-gigs.png), [9](docs/screenshots/09-freelancer-income.png) |
| 6 | Security: JWT on protected routes, RBAC, input sanitised | `protect` (JWT + DB user), `requireRole`, `requireOwnership`, validators, HTML escaping, `express-mongo-sanitize` | `api/src/middleware/` (authMiddleware, ownership, validators, sanitize, validateObjectId) | Newman **Auth**, **RBAC** and **Security** folders; route audit table above; `ProtectedRoute.test.jsx`, `client.test.js` | Newman Auth, RBAC and Security folders in [`newman-main-results.txt`](docs/test-evidence/newman-main-results.txt); [`vitest-results.txt`](docs/test-evidence/vitest-results.txt) |
| 7 | Rate limiting on sensitive endpoints with a meaningful response | Login (failed only), register, booking (per user), general; `429` + `Retry-After` + message; strict in production | `api/src/middleware/rateLimiters.js`, `config/rateLimits.js` | Newman **rate limit collection** (6th failed login and 11th booking get `429`); `BookingPanel.test.jsx` and `Login.test.jsx` show the retry message | [`newman-rate-limits-results.txt`](docs/test-evidence/newman-rate-limits-results.txt); screenshots [11b](docs/screenshots/11b-newman-rate-limits.png), [14](docs/screenshots/14-rate-limit-429.png) |
| 8 | Helmet security headers with a restrictive CSP | Explicit Helmet config, CSP without `unsafe-inline`/`unsafe-eval` on the API; client CSP meta tag at build time and as headers in preview | `api/src/config/security.js`, `client/vite.config.js` | Newman **Security** folder (headers); headless-browser check of the built client: 0 CSP violations | Newman Security folder in [`newman-main-results.txt`](docs/test-evidence/newman-main-results.txt); screenshots [13](docs/screenshots/13-security-headers.png), [13b](docs/screenshots/13b-security-headers-continued.png) |
| 9 | Testing: Postman + Newman for key endpoints; frontend tests for rendering and interaction | Main collection (Auth, RBAC, Gigs, Bookings, Income, Security), rate limit collection, 67 Vitest tests | `api/postman/`, `client/src/**/*.test.js(x)` | `npx newman run ...` and `npm run test:run` (see **Testing**) | All three files in [`docs/test-evidence/`](docs/test-evidence/README.md); screenshots [11](docs/screenshots/11-newman-pass.png), [11b](docs/screenshots/11b-newman-rate-limits.png), [12](docs/screenshots/12-vitest-pass.png) |
| 10 | README: features, security, how to run backend and frontend, testing | This document | `README.md`, `api/certs/README.md` | Every command run on a fresh clone | This README; every command run on a fresh clone |
| 11 | Demonstration video: auth, gig creation, booking, transaction recording | Recorded walkthrough | See **Demonstration Video** | Watching the video | [Demo video](https://youtu.be/H5GcOdMPQNw) |

## 13. Known Limitations and Part 3 Notes

- **JWT in `localStorage`.** Accepted for this POE; any XSS could read the
  token. The risk is reduced by escaping, React's text rendering and the
  strict CSP (see **JWT in localStorage: the trade-off**). An `httpOnly`
  cookie with CSRF protection is the stronger option for a real deployment.
- **`trust proxy` is off.** The API uses the connection's IP for rate
  limiting, so a client can't fake its IP with an `X-Forwarded-For` header.
  Behind a reverse proxy or load balancer (Part 3), every request would
  appear to come from the proxy and share one limit: set
  `app.set('trust proxy', 1)` (the number of proxies in front of the API),
  never `true`.
- **Rate limit counters live in memory.** They reset when the API restarts
  and aren't shared between multiple API instances; a shared store such as
  Redis would be needed when scaling out.
- **Dev-only audit finding:** `braces` via `nodemon` (see **Dependency
  audit**). Production dependencies have 0 known vulnerabilities.
- **Payments are simulated.** A transaction is created as `completed` with a
  reference; no payment provider is involved and no money moves.
- **Not built yet (Part 3):** tax estimation, income dashboard charts,
  GitHub Actions CI/CD, Docker images, static analysis and cloud logging. The
  data model is ready for them: amounts are numbers, every record has
  timestamps, and income is already aggregated per freelancer.
- **Local HTTPS only.** The self-signed certificate is for development; a
  deployment needs a real certificate, and the production host should send
  the client's security headers (including `frame-ancestors 'none'`).

## 14. Screenshots

The images live in `docs/screenshots/`; [`docs/screenshots/README.md`](docs/screenshots/README.md)
describes what each one should show.

**01-register**

![Register page showing inline "Name is required", "Email is required" and "Password is required" errors and a role choice of only Client or Freelancer](docs/screenshots/01-register.png)

_Invalid input is caught next to each field before anything is sent, and the only roles on offer are client and freelancer; admin can never be chosen (the API rejects it too)._

**02-login**

![Login page showing the generic "Invalid email or password" message with the password field masked](docs/screenshots/02-login.png)

_A failed login shows the same generic message whether the email exists or not, so accounts can't be enumerated._

**03-browse-gigs**

![Browse gigs page for a logged-in client with search, category and price filters and gig cards showing prices in rand and freelancer names](docs/screenshots/03-browse-gigs.png)

_Clients browse active gigs with search and filters; each gig shows its freelancer by name only, never their email._

**04-create-gig**

![New gig form filled in by a freelancer with title, description, price, delivery days and category](docs/screenshots/04-create-gig.png)

_Freelancers create gigs through a form whose limits mirror the API validators; there is no owner field, because the API takes the owner from the login token._

**05-my-gigs**

![My gigs page for a freelancer listing only their own gigs with Active and Inactive badges and a confirmation that a gig is now inactive](docs/screenshots/05-my-gigs.png)

_A freelancer sees and manages only their own gigs (edit, activate/deactivate, delete)._

**06-book-confirm**

![Booking confirmation step on a gig page showing the gig title, the price R 450,00 and the "Payment is simulated" notice](docs/screenshots/06-book-confirm.png)

_The price shown comes from the gig in the database; the booking request sends only the gig id, and the payment is simulated._

**07-booking-confirmed**

![Booking confirmed message with the transaction reference TXN-20261012-889A22AF615D](docs/screenshots/07-booking-confirmed.png)

_Every booking immediately creates a transaction record; its reference is returned with the confirmation._

**08-client-bookings**

![My bookings page for a client listing three confirmed bookings with gig, freelancer, price and date](docs/screenshots/08-client-bookings.png)

_A client sees only their own bookings, each keeping the price it was booked at._

**09-freelancer-income**

![Income page for a freelancer showing R 750,00 earned from 2 bookings with each transaction reference](docs/screenshots/09-freelancer-income.png)

_Income is computed from completed transactions and attributed to the right freelancer; reference TXN-20261012-889A22AF615D from screenshot 7 appears here, linking the booking to this freelancer._

**10-admin-transactions**

![Admin all transactions page listing each reference with its client, freelancer, amount, status and date](docs/screenshots/10-admin-transactions.png)

_Admin-only view: every transaction is linked to both the client and the freelancer of its booking, including the same reference again._

**11-newman-pass**

![Terminal summary of the main Newman run with 80 requests and 134 assertions, 0 failed (editor pane redacted)](docs/screenshots/11-newman-pass.png)

_The main Postman collection passes (this run without admin credentials, so the 5 admin requests were skipped; the committed evidence file has the full 85 / 145 run). The editor pane was blacked out because it showed the local .env._

**11b-newman-rate-limits**

![Terminal summary of the rate limit Newman run with 20 requests and 26 assertions, 0 failed](docs/screenshots/11b-newman-rate-limits.png)

_Against the strict limits, the 6th failed login and the 11th booking are refused with 429, a Retry-After header and a meaningful message._

**12-vitest-pass**

![Terminal summary of Vitest showing 16 test files and 67 tests passed (editor pane redacted)](docs/screenshots/12-vitest-pass.png)

_All frontend tests pass. The editor pane was blacked out because it showed the local .env._

**13-security-headers**

![Browser DevTools showing API response headers including Content-Security-Policy, Cross-Origin policies, Referrer-Policy no-referrer, Strict-Transport-Security and X-Content-Type-Options nosniff](docs/screenshots/13-security-headers.png)

_The API sends a strict CSP (default-src 'self', frame-ancestors 'none', no unsafe-inline), HSTS, nosniff and no-referrer, and no X-Powered-By. (Captured on the relaxed test server, hence the 10000 RateLimit policy.)_

**13b-security-headers-continued**

![The same response headers scrolled further, showing X-Frame-Options DENY, X-Permitted-Cross-Domain-Policies none and X-XSS-Protection 0](docs/screenshots/13b-security-headers-continued.png)

_The rest of the Helmet headers, including X-Frame-Options DENY against clickjacking._

**14-rate-limit-429**

![Login page showing "Too many requests, please try again in 896 seconds." after repeated failed logins](docs/screenshots/14-rate-limit-429.png)

_Rate limiting with a meaningful response: after 5 failed logins the 6th is refused and the user is told how long to wait._

## 15. Demonstration Video

**Part 2:** https://youtu.be/H5GcOdMPQNw

[![Watch the demo](https://img.youtube.com/vi/H5GcOdMPQNw/hqdefault.jpg)](https://youtu.be/H5GcOdMPQNw)

The video shows registration and login, gig creation, booking creation and
viewing, transaction recording, role-based access, the security headers, the
tests and rate limiting.

Part 1 (API only): https://youtu.be/qTK6iV_0lmI

## Appendix: Part 1 API Screenshots

From the Part 1 submission (Postman, API only), kept for reference in
`docs/screenshots/part1/`.

| Scenario | Screenshot |
|---|---|
| Health check | `docs/screenshots/part1/01-health-check.png` |
| Successful registration (token issued, no password hash leaked) | `docs/screenshots/part1/02-register-success.png` |
| Duplicate email registration rejected | `docs/screenshots/part1/03-register-duplicate.png` |
| Invalid registration input rejected | `docs/screenshots/part1/04-register-invalid.png` |
| Successful login (token issued) | `docs/screenshots/part1/05-login-success.png` |
| Login with wrong password rejected | `docs/screenshots/part1/06-login-wrong-password.png` |
| Protected route rejected with no token | `docs/screenshots/part1/07-protected-no-token.png` |
| Protected route succeeds with valid token | `docs/screenshots/part1/08-protected-valid-token.png` |

![Health Check](./docs/screenshots/part1/01-health-check.png)
![Register Success](./docs/screenshots/part1/02-register-success.png)
![Register Duplicate](./docs/screenshots/part1/03-register-duplicate.png)
![Register Invalid](./docs/screenshots/part1/04-register-invalid.png)
![Login Success](./docs/screenshots/part1/05-login-success.png)
![Login Wrong Password](./docs/screenshots/part1/06-login-wrong-password.png)
![Protected No Token](./docs/screenshots/part1/07-protected-no-token.png)
![Protected Valid Token](./docs/screenshots/part1/08-protected-valid-token.png)
