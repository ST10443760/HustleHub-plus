# Pipeline evidence

Evidence for the GitHub Actions pipeline in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml). The README
section **CI/CD pipeline** explains what each job does.

| File | What it is |
|---|---|
| [`local-checks.txt`](local-checks.txt) | Output of the pipeline's lint and config commands run locally on the committed workflow: actionlint, zizmor (strictest `auditor` persona), hadolint on all three Dockerfiles, `docker compose config` on both Compose files plus the check that Compose refuses to start without `JWT_SECRET`, and `npm audit` for the api and the client. All clean |
| [`remote-run-status.md`](remote-run-status.md) | The first run on GitHub. **No job ran**: GitHub refused to start them because the account that owns the repository is locked for a billing issue. It records the run link and every job's status as GitHub reported it |

Also verified locally, with the same commands the jobs run (the outputs
are in [`../test-evidence/`](../test-evidence/README.md) where they are
test runs):

- **Backend and frontend jobs:** 68 unit tests, 88 Vitest tests, lint,
  build (with the CSP meta tag check) and both production audits pass,
  run with `bash -eo pipefail` like the pipeline.
- **Stack job,** in a fresh clone with generated credentials:
  - all images build and the stack comes up healthy
  - smoke test: 12 checks passed
  - rate limit collection through nginx with the strict limits: 20
    requests, 26 assertions, 0 failed
  - admin seeded, then the main collection against the test override:
    94 requests, 173 assertions, 0 failed
  - the uploaded files (JUnit and slim JSON) contain no password, unlike
    the raw Newman JSON, which is never uploaded
- **Secret scan:** gitleaks over the full history found no leaks.
- **Image scan:** Trivy finds no fixable HIGH/CRITICAL vulnerability in
  the api, client or certs image, and no misconfiguration in any
  Dockerfile.
- **Dynamic scan:** ZAP baseline finds 0 FAIL in about a minute. Pointing
  it at a page without the headers gives FAIL and exit 1, which proves the
  rules fail the job.
- **Fails closed:** each of these was broken on purpose, shown to exit 1,
  then restored without being committed:
  - a unit test assertion
  - the api lockfile (rolled back to the version with the body-parser
    advisory, so `npm audit` fails)
  - the health check response (so a Newman assertion fails)

When the GitHub account is unlocked and the pipeline has run green, save
its job list and summary here (`green-run.md`) and remove
`remote-run-status.md`.
