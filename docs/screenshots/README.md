# Screenshots

The main README's section **15. Demonstration evidence** lists these
images with a caption for each. The first table is the Part 2 set; the
Part 3 set is below it. Use exactly
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
| `11b-newman-rate-limits.png` | Terminal: the rate limit collection against the strict limits with 0 failures |
| `12-vitest-pass.png` | Terminal: `npm run test:run` in `client/` showing all test files and tests passing |
| `13-security-headers.png` | Response headers of an API or preview response (DevTools Network tab or `curl -k -I`): Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, no X-Powered-By |
| `13b-security-headers-continued.png` | The same headers scrolled further: X-Frame-Options and the rest of the Helmet headers |
| `14-rate-limit-429.png` | A `429 Too Many Requests` response with the `Retry-After` header and the "Too many requests, please try again in N seconds." message (e.g. the 6th failed login) |

`part1/` holds the Part 1 Postman screenshots, which the main README keeps as an appendix.

## Part 3 screenshots

Taken from the running Docker stack on 9 November 2026 with throwaway
accounts (`test-shots-...@example.com`). Desktop shots are 1440 wide; the
phone shot is 390 wide. The admin's email is greyed out on the Users page.

| File | What it shows |
|---|---|
| `part3-01-income-dashboard.png` | A freelancer's Income dashboard for the 2026/27 tax year: R 300 000,00 earned from 3 bookings, R 40 572,00 estimated tax, R 259 428,00 take-home, 13,52% effective rate, the monthly chart, the tax by bracket table, the assumptions and the income per booking |
| `part3-02-chart-hover.png` | The monthly income chart with the November bar hovered, showing "R 300 000,00 · 3 bookings" |
| `part3-03-tax-by-bracket.png` | The tax by bracket table: R 44 118,00 and R 14 274,00 in the first two brackets, R 58 392,00 before the rebate, less R 17 820,00, R 40 572,00 estimated tax |
| `part3-04-assumptions-disclaimer.png` | "How this estimate works": the method, the assumptions, the disclaimer and the SARS source |
| `part3-05-empty-tax-year.png` | The 2025/26 tax year with no income: R 0,00 everywhere, "No income in this tax year yet", and that year's brackets and rebate |
| `part3-06-dashboard-phone.png` | The same dashboard at phone width (390 px): stacked cards, the chart scrolled to November, the tables as labelled rows |
| `part3-07-account-validation.png` | The Account page after submitting an empty change-password form: an inline error under each field |
| `part3-08-account-wrong-current.png` | A wrong current password: "Current password is incorrect, or there have been too many attempts. Try again later." The user stays logged in |
| `part3-09-account-success.png` | A successful change: "Password changed. You have been signed out everywhere else." and the fields cleared |
| `part3-10-lockout-correct-password-rejected.png` | After 5 wrong passwords, the CORRECT password is still refused with the same "Invalid email or password" (the password field is masked) |
| `part3-12-sign-out-confirm.png` | The "Sign out of all devices?" confirmation box with "Yes, sign out everywhere" and Cancel |
| `part3-14-audit-log.png` | The admin Audit log: Account locked (5 failed attempts, locked 15 min), Signed out of all devices, Password changed and Admin deleted a gig, each with actor, target, outcome and IP |
| `part3-15-audit-log-filtered.png` | The Audit log filtered to "Password changed" |
| `part3-16-admin-users.png` | The admin Users page: name, email, role and join date (the admin's email greyed out) |
| `part3-17-admin-transactions.png` | The admin All transactions page: three R 100 000,00 transactions, each linked to its client and freelancer |
| `part3-18-client-transactions.png` | The client's My transactions page with each `TXN-...` reference |

Numbers 11 and 13 are not used: the login page does not show the "Your
session has ended" and "You have been signed out of all devices" messages
(see Known limitations in the main README).
