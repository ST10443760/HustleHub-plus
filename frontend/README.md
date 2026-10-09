
# HustleHub+ Frontend

## Overview

This folder contains the React frontend for HustleHub+,
a platform for discovering and booking gig opportunities.

## Technologies

- React
- Vite
- CSS
- Vitest
- React Testing Library

## Implemented Features

- User registration form
- User login form
- Frontend form validation
- Connection to backend registration and login endpoints
- User-friendly error messages
- Gig browsing using sample data
- Search gigs by title, category or location
- Gig details page
- Booking form with date validation
- Navigation between authentication and gig pages

## Current Limitations

- Gig listings currently use sample data.
- Booking requests are not yet saved to the backend.
- Authentication tokens are not yet implemented because the
  current backend login response does not return a token.
- Gig browsing is currently accessible without login.

## Running the Frontend

Open a terminal in the frontend folder and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173/ in your browser.

## Running the Backend

From the project root, run:

```bash
node src/server.js
```

The backend runs at https://localhost:5000/.

The local HTTPS server uses a self-signed certificate,
which may require accepting a browser security warning
during development.

## Running Automated Tests

From the frontend folder, run:

```bash
npx vitest run --environment jsdom
```

## Automated Tests

1. Component rendering test: verifies that gig listings display.
2. Interaction test: verifies that searching filters gig listings.

## Backend Integration

The registration and login forms communicate with:

- POST /api/auth/register
- POST /api/auth/login

Gig listing and booking API integration will be added
when the corresponding backend endpoints are available.
