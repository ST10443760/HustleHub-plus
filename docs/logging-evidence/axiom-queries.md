# Axiom queries for HustleHub+

Ready-to-paste APL (Axiom Processing Language) queries for the
`hustlehub-api` dataset. Each one searches the stable event names from the
event catalogue (`api/src/utils/logEvents.js`, and the README section
"Logging and monitoring").

**How to run one:** in Axiom, open the **Query** tab, click **Editor**
(top left), paste the query, pick a time range (for example "Last 24
hours") and click **Run**. Field names with a dot or a dash need the
bracket form, like `['hustlehub-api']`.

## Security queries

### 1. Failed logins by IP (brute force, password spraying)

```kusto
['hustlehub-api']
| where event == "AUTH_LOGIN_FAILURE"
| summarize failures = count(), accounts = dcount(userId) by ip
| sort by failures desc
```

Many failures from one IP points to brute force. One IP failing against
many different accounts (`accounts`) points to password spraying. The
`reason` field says whether the password was wrong (`bad_credentials`) or
the account was already locked (`locked`). The person logging in only
ever sees "Invalid email or password".

### 2. Account lockouts

```kusto
['hustlehub-api']
| where event == "AUTH_LOCKOUT"
| project _time, userId, ip, failedAttempts, lockMinutes, requestId
| sort by _time desc
```

Each row is an account locked for 15 minutes after 5 wrong passwords in
15 minutes. The same account locked again and again is being targeted.
Many accounts locked from one IP is an attack on the whole user base.

### 3. Access denied (403) by route

```kusto
['hustlehub-api']
| where event == "ACCESS_DENIED" and status == 403
| summarize denials = count() by route, reason, role
| sort by denials desc
```

`reason` is `wrong_role` (for example a client opening a freelancer page)
or `not_owner` (someone editing or deleting another user's gig). Repeated
`not_owner` denials from one `userId` look like someone probing for other
people's records (an IDOR attempt). To see the 401s as well (missing,
invalid, expired or revoked tokens), drop `and status == 403` and group by
`reason`.

### 4. Rate limit hits (429) by limiter

```kusto
['hustlehub-api']
| where event == "RATE_LIMIT_EXCEEDED"
| summarize hits = count() by limiter, ip
| sort by hits desc
```

`limiter` is `login`, `register`, `booking`, `passwordChange` or
`general`. Login hits mean password guessing. Register hits mean
mass sign-ups. Booking hits mean booking spam or fraud.

## Business and health queries

### 5. Bookings per hour

```kusto
['hustlehub-api']
| where event == "BOOKING_CREATED"
| summarize bookings = count(), value = sum(price) by bin(_time, 1h)
```

Click the chart icon to see it as a time series. A sudden jump in
bookings from one client is worth a look (booking fraud). To check that
every booking has its transaction, compare the counts:

```kusto
['hustlehub-api']
| where event == "BOOKING_CREATED" or event == "TRANSACTION_CREATED"
| summarize count() by event, bin(_time, 1h)
```

The two lines should always match. A gap would mean a booking without a
payment record. The API writes both in one database transaction, so it
should never happen.

### 6. Server errors

```kusto
['hustlehub-api']
| where event == "ERROR_UNHANDLED" or event == "AUDIT_WRITE_FAILED" or (event == "HTTP_REQUEST" and status >= 500)
| project _time, event, errorName, errorMessage, status, method, path, requestId
| sort by _time desc
```

Outages, database problems and audit log failures. Copy a `requestId`
into the next query to see everything that happened in that request.

### 7. Everything in one request

```kusto
['hustlehub-api']
| where requestId == "PASTE-THE-REQUEST-ID-HERE"
| sort by _time asc
```

The API returns the same id in the `X-Request-Id` response header, so a
user's error report (or the browser's network tab) leads straight to the
log lines.

### 8. Slowest routes

```kusto
['hustlehub-api']
| where event == "HTTP_REQUEST"
| summarize requests = count(), avgMs = avg(durationMs), maxMs = max(durationMs) by method, path
| sort by avgMs desc
| take 10
```

## Three monitors for the free plan

The free plan allows three monitors, and email is one of its notifier
types. Create an email notifier first: **Monitors** tab, **Manage
notifiers** (right side), **New notifier**, give it a name, choose
**Email**, add your address and click **Create**.

Then for each monitor: **Monitors** tab, **New monitor**, **Threshold
monitor**, choose **Advanced query language**, paste the query, click
**Run query** to check it, fill in the settings below, add the notifier
and click **Create**. Axiom recommends `bin` (not `bin_auto`) in monitor
queries, and the last step must be a `summarize`.

| Monitor | Query | Settings |
|---|---|---|
| Brute force on login | `['hustlehub-api'] \| where event == "AUTH_LOGIN_FAILURE" \| summarize count() by bin(_time, 5m)` | Frequency 5 min, range 5 min, **above** 20 |
| Lockouts or rate limiting | `['hustlehub-api'] \| where event == "AUTH_LOCKOUT" or event == "RATE_LIMIT_EXCEEDED" \| summarize count() by bin(_time, 10m)` | Frequency 10 min, range 10 min, **above or equal** 5 |
| Server errors | `['hustlehub-api'] \| where event == "ERROR_UNHANDLED" \| summarize count() by bin(_time, 5m)` | Frequency 5 min, range 5 min, **above** 0 |

The thresholds suit a small student project. A busier site would raise
them after watching normal traffic for a while.

## A small dashboard (optional)

**Dashboards** tab, **New dashboard**, **Empty dashboard**, name it
"HustleHub+ security", **Create dashboard**. Then **Add element**, choose
**Time series** (or **Statistic** for a single number), click **APL**,
paste a query, **Run query**, **Save**. When all the charts are added,
click **Save** at the bottom of the dashboard.

Suggested charts:

| Chart | Query |
|---|---|
| Logins: success vs failure | `['hustlehub-api'] \| where event == "AUTH_LOGIN_SUCCESS" or event == "AUTH_LOGIN_FAILURE" \| summarize count() by event, bin_auto(_time)` |
| Denied and limited requests | `['hustlehub-api'] \| where event == "ACCESS_DENIED" or event == "RATE_LIMIT_EXCEEDED" \| summarize count() by event, bin_auto(_time)` |
| Bookings | `['hustlehub-api'] \| where event == "BOOKING_CREATED" \| summarize count() by bin_auto(_time)` |
| Server errors (statistic) | `['hustlehub-api'] \| where event == "ERROR_UNHANDLED" \| summarize count()` |
