# Remote run status

Run: https://github.com/ST10443760/HustleHub-plus/actions/runs/42386239043 (push to `main`, commit `6e64fbf`, 7 November 2026)

**Result: no job ran.** GitHub did not start any job and gave this reason on each one:

> The job was not started because your account is locked due to a billing issue.

That is an account setting on GitHub, not a problem in the workflow. The jobs below show `failure` (never started) or `skipped` (their dependencies never ran). Nothing in this run says anything about the code: see `local-checks.txt` and the README for what was verified locally.

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

Once the billing lock is cleared, re-run the workflow (Actions → CI → Run workflow) and replace this file with the green run.
