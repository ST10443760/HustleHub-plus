# Screenshots

The main README's **Screenshots** section shows these images. Use exactly
these file names. Never capture a real token, password, connection string
or the `.env` file in a screenshot.

| File | What it should show |
|---|---|
| `01-register.png` | The Register page with an inline validation error visible (e.g. a short password) and the client / freelancer role choice |
| `02-login.png` | The Login page (optionally with the generic "Invalid email or password" message after a wrong password) |
| `03-browse-gigs.png` | Browse gigs as a client: search box, category and price filters, gig cards with price, delivery days and freelancer name |
| `04-create-gig.png` | A freelancer's New gig form, filled in (title, description, price, delivery days, category) |
| `05-my-gigs.png` | My gigs with at least one Active and one Inactive badge and the Edit / Activate-Deactivate / Delete buttons |
| `06-book-confirm.png` | The booking confirmation step on a gig page: gig title, price in rand and the "Payment is simulated" notice |
| `07-booking-confirmed.png` | "Booking confirmed" with the `TXN-...` transaction reference and the link to My bookings |
| `08-client-bookings.png` | A client's My bookings table (gig, freelancer, price, date, status) |
| `09-freelancer-income.png` | A freelancer's Income page: total earned, number of bookings and the per-booking table |
| `10-admin-transactions.png` | The admin's All transactions table (reference, client, freelancer, amount, status, date) |
| `11-newman-pass.png` | Terminal: `npx newman run postman/HustleHub_API.postman_collection.json --insecure` with the summary table showing 0 failures |
| `12-vitest-pass.png` | Terminal: `npm run test:run` in `client/` showing all test files and tests passing |
| `13-security-headers.png` | Response headers of an API or preview response (DevTools Network tab or `curl -k -I`): Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, no X-Powered-By |
| `14-rate-limit-429.png` | A `429 Too Many Requests` response with the `Retry-After` header and the "Too many requests, please try again in N seconds." message (e.g. the 6th failed login) |

`part1/` holds the Part 1 Postman screenshots, which the main README keeps as an appendix.
