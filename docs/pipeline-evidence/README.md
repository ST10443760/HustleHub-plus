# Pipeline evidence

Evidence for the GitHub Actions pipeline in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). The main
README section **11. CI/CD pipeline** explains what each job does, and its
subsection **Pipeline status and the billing lock** explains why the jobs
were run locally.

GitHub doesn't start any job for this repository while the account is
locked for a billing issue, so every job was run locally on 9 November
2026 with the same commands and the same pinned tool images.

| File | What it is |
|---|---|
| [`local-checks.txt`](local-checks.txt) | The lint, config and audit commands: actionlint, zizmor (strictest `auditor` persona), hadolint on all three Dockerfiles, `docker compose config` on both Compose files plus the check that Compose refuses to start without `JWT_SECRET`, and `npm audit --omit=dev` for the api and the client (all clean). Also the full `npm audit` including dev tools, for the record |
| [`gitleaks.txt`](gitleaks.txt) | gitleaks over the full history: no leaks |
| [`trivy-results.txt`](trivy-results.txt) | Trivy on the api, client and certs images (0 fixable HIGH or CRITICAL vulnerabilities) and on the three Dockerfiles (0 misconfigurations) |
| [`zap-baseline.txt`](zap-baseline.txt) | The OWASP ZAP baseline scan of the running stack: 0 FAIL, 3 WARN (informational), 65 PASS |
| [`remote-run-status.md`](remote-run-status.md) | What GitHub reports for the remote runs: no job started, because of the billing lock |
| `billing-lock-actions-run.png`, `billing-lock-account.png` | Screenshots of an Actions run with GitHub's billing lock message and of the billing notice (added by the team) |

The test jobs' outputs are in [`../test-evidence/`](../test-evidence/README.md):

- **Backend and frontend jobs:** 191 unit tests, 116 Vitest tests, lint,
  the build (with the CSP meta tag) and both production audits pass.
- **Stack job:** all images build and the stack is healthy; smoke test 15
  checks; the rate limit collection 20 requests and 26 assertions; the
  main collection against the test override 131 requests and 246
  assertions; 0 failed.
- **Static analysis job:** ESLint 0 problems in both packages, Semgrep 0
  findings (see [`../static-analysis/`](../static-analysis/README.md)).

**Fails closed.** Each of these was broken on purpose, shown to exit 1,
then restored without being committed:

- a unit test assertion (`npm test`)
- the api lock file, rolled back to the version with the body-parser
  advisory (`npm audit --omit=dev --audit-level=high`)
- the health check response (a Newman assertion fails)
- ZAP pointed at a page without the security headers (FAIL rules)
- an `eval` of `req.query` and a hard-coded JWT secret in
  `api/src/app.js` (ESLint and Semgrep)

When the account is unlocked and the pipeline has run, save that run's job
list and summary here and update `remote-run-status.md`.
