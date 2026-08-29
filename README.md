# HustleHub+ — Backend (Part 1: Secure Foundations)

Secure freelance marketplace platform. This repo currently covers Part 1 of the
INSY7314 / APDS7311 POE: a secure Express API supporting registration and login.

**Group:** Null Devs
**Members:** Muaaz (Group Leader), Kredasan, Virona, Lihle

## 1. System Overview
<!-- Muaaz: describe HustleHub+, its purpose, and its intended users
     (Clients, Freelancers, Admins) here. -->

## 2. Project Structure
```
src/
  app.js              # Express app, middleware pipeline, route mounting
  server.js           # entry point - starts the server
  routes/             # Kredasan & Virona add route files here
  controllers/         # route handler logic
  models/             # data storage (in-memory/file for now)
  middleware/
    errorHandler.js   # centralised error handling (Lihle extends this)
  utils/
    logger.js         # shared logging utility
```

## 3. Getting Started
```bash
npm install
cp .env.example .env   # fill in your own JWT_SECRET
npm run dev             # or: npm start
```
API runs at `http://localhost:5000` (HTTPS setup pending - see Lihle's section).

Health check: `GET /api/health`

## 4. Authentication & Password Security
<!-- Kredasan: explain registration/login flow and password hashing here.
     Note: we use `bcryptjs` (pure JS, no native compilation) instead of
     `bcrypt` - same API (bcryptjs.hash(), bcryptjs.compare()), just avoids
     native build tooling and its dependency vulnerabilities. -->

## 5. Token-Based Authentication (JWT)

JSON Web Tokens (JWT) are used to authenticate users and protect restricted
API routes.

When a user successfully authenticates, a JWT can be generated using the
`generateToken()` utility in `src/utils/jwt.js`. The token contains the user's
`userId` and `role` and is signed using the `JWT_SECRET` stored in the
environment configuration. The token expiration is controlled by
`JWT_EXPIRES_IN`, which defaults to `1h`.

For protected requests, the client sends the JWT in the HTTP
`Authorization` header using the Bearer scheme:

```text
Authorization: Bearer <JWT>
```

The `authenticateToken` middleware in `src/middleware/auth.js` checks that the
Authorization header is present and correctly formatted. It then verifies the
JWT using the configured secret. If the token is valid, the decoded user
information is attached to `req.user` and the request continues to the
protected route.

Invalid, expired, or missing tokens are rejected with an appropriate
authentication error.

### Protected Route

The API includes a protected test endpoint:

```text
GET /api/protected
```

This route uses the `authenticateToken` middleware and can only be accessed
when a valid JWT is supplied.

### JWT Security Configuration

JWT configuration is stored in environment variables:

```text
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1h
```

The real `JWT_SECRET` is not committed to the repository. Only the
`.env.example` file is included so developers know which configuration
variables are required.


## 6. HTTPS, Validation & Error Handling
<!-- Lihle: explain the local SSL setup, input validation rules, and how
     the centralised error handler avoids leaking internal details. -->

## 7. Security Decisions Summary
<!-- Muaaz: pull the above sections together into a short "why we made
     these choices" summary once everyone's content is in. -->

## 8. Testing
Postman collection: `<add link/path once exported>`

## 9. Demonstration Video
`<add link here>`
