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
<!-- Virona: explain the JWT issue -> attach -> verify flow here. -->

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
