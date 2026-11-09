# Remote run status

**Result: no job has ever run on GitHub.** GitHub doesn't start any job,
because the account that owns the repository is locked due to a billing
issue. Every job gives this reason:

> The job was not started because your account is locked due to a billing issue.

That is an account setting on GitHub, not a problem in the workflow or the
code: no step of the workflow ran. Jobs show `failure` (never started) or
`skipped` (their dependencies never ran), with 0 steps each.

The first run (push to `main`, commit `6e64fbf`, 7 November 2026) reported
these jobs:

| Job | Conclusion | Steps run |
|---|---|---|
| Frontend - tests, build and npm audit | failure | 0 |
| Backend - unit tests and npm audit | failure | 0 |
| Lint - Dockerfiles, Compose and workflows | failure | 0 |
| Secret scan - gitleaks (full history) | failure | 0 |
| Pipeline OK | failure | 0 |
| Image scan - Trivy | skipped | 0 |
| Stack - build, smoke test and Newman | skipped | 0 |
| Dynamic scan - OWASP ZAP baseline | skipped | 0 |

(The static analysis job was added to the workflow later.) Every later run,
up to the last one checked on 9 November 2026, also ran 0 steps for the
same reason.

What was verified locally instead is in [`README.md`](README.md) in this
folder and in the main README section "Pipeline status and the billing
lock". Once the billing lock is cleared, re-run the workflow (Actions, CI,
Run workflow) and replace this file with the result of that run.
