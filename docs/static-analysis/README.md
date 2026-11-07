# Static analysis results

Raw output of the two static analysis tools, before and after the
findings were triaged. The README section **Static code analysis**
explains the tools, every finding, every fix and every suppression.

- [`baseline/`](baseline/) is the first run, with **no code changes**,
  committed on its own (`ad1025c`) before any fix. It is kept exactly as
  produced and never edited afterwards.
- [`final/`](final/) is the run after all fixes, on the committed code.

Both folders hold the same files:

| File | Tool | What it is |
|---|---|---|
| `eslint-api.json` | ESLint | Every ESLint message for `api/`, in ESLint's JSON format (file, line, rule, severity, message). Paths are absolute paths on the machine that ran it |
| `eslint-api.txt` | ESLint | The same, as the readable report `npm run lint` prints (stylish format). ESLint prints nothing when there are no findings, so in `final/` this file (and `eslint-client.txt`) is empty |
| `eslint-client.json` | ESLint | Every ESLint message for `client/`, JSON |
| `eslint-client.txt` | ESLint | The same, readable |
| `semgrep.json` | Semgrep | Semgrep's JSON output: each finding with rule id, severity, file, line and the matched code, plus scan errors and skipped files |
| `semgrep.sarif` | Semgrep | The same findings in SARIF 2.1.0, the standard format GitHub code scanning and most IDEs can load |
| `semgrep.txt` | Semgrep | The console output of `node .semgrep/run.mjs`, including the scan summary (rules run, files scanned) |
| `summary.txt` | both | Counts by tool, rule and severity, made from the JSON files with [`.github/scripts/static-analysis-summary.mjs`](../../.github/scripts/static-analysis-summary.mjs) |

Commands that produced them (from the repo root; `<dir>` is `baseline` or
`final`):

```bash
cd api    && npx eslint . -f json -o ../docs/static-analysis/<dir>/eslint-api.json;    npx eslint . > ../docs/static-analysis/<dir>/eslint-api.txt;    cd ..
cd client && npx eslint . -f json -o ../docs/static-analysis/<dir>/eslint-client.json; npx eslint . > ../docs/static-analysis/<dir>/eslint-client.txt; cd ..
node .semgrep/run.mjs --out docs/static-analysis/<dir> > docs/static-analysis/<dir>/semgrep.txt
node .github/scripts/static-analysis-summary.mjs docs/static-analysis/<dir> > docs/static-analysis/<dir>/summary.txt
```

The baseline was taken with the ESLint configs as first added (before
`react/prop-types` was turned off and before `--max-warnings 0` was added
to `npm run lint`). Semgrep used the same seven rule packs both times.
