// Summarises a Newman JSON report. Node 22, no dependencies.
//
//   node .github/scripts/newman-summary.mjs <report.json> "<title>" [slim.json]
//
// - Prints a Markdown summary (requests, assertions, failures) for
//   $GITHUB_STEP_SUMMARY.
// - With a third argument, also writes a SLIM copy of the report for the
//   build artifacts. The full Newman JSON contains the environment
//   variables (including the generated admin password) and every request
//   and response body (passwords, tokens), so only the slim copy is ever
//   uploaded: names, methods, status codes and assertion results.
import { readFileSync, writeFileSync } from 'node:fs';

const [file, title = 'Newman', slimFile] = process.argv.slice(2);
if (!file) {
  console.error('usage: newman-summary.mjs <report.json> [title] [slim.json]');
  process.exit(2);
}

const { run, collection } = JSON.parse(readFileSync(file, 'utf8'));
const stat = (name) => run.stats[name] || { total: 0, failed: 0 };
const requests = stat('requests');
const assertions = stat('assertions');
const failures = run.failures.map((f) => ({
  request: f.source?.name ?? 'unknown request',
  test: f.error?.test ?? f.error?.name ?? 'error',
  message: f.error?.message ?? '',
}));
const ok = requests.failed === 0 && assertions.failed === 0 && failures.length === 0;

if (slimFile) {
  const slim = {
    collection: collection?.info?.name,
    ok,
    stats: { requests, assertions },
    failures,
    executions: run.executions.map((e) => ({
      request: e.item?.name,
      method: e.request?.method,
      status: e.response?.code ?? null,
      assertions: (e.assertions || []).map((a) => ({ name: a.assertion, passed: !a.error, skipped: Boolean(a.skipped) })),
    })),
  };
  writeFileSync(slimFile, `${JSON.stringify(slim, null, 2)}\n`);
}

const lines = [
  `### ${ok ? '✅' : '❌'} ${title}`,
  '',
  '| | Total | Failed |',
  '|---|---|---|',
  `| Requests | ${requests.total} | ${requests.failed} |`,
  `| Assertions | ${assertions.total} | ${assertions.failed} |`,
  '',
];
if (failures.length > 0) {
  lines.push('Failures:', '', ...failures.slice(0, 20).map((f) => `- ${f.request}: ${f.test}`), '');
}
console.log(lines.join('\n'));
