// Counts static analysis findings by tool, rule and severity.
// Node 22, no dependencies. Prints plain text, or Markdown with --markdown.
//
//   node .github/scripts/static-analysis-summary.mjs <dir> [--markdown]
//
// <dir> holds eslint-api.json, eslint-client.json (ESLint JSON formatter)
// and semgrep.json (Semgrep JSON output). Missing files are reported as
// missing, never as zero findings.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
const markdown = process.argv.includes('--markdown');
if (!dir) {
  console.error('usage: static-analysis-summary.mjs <dir> [--markdown]');
  process.exit(2);
}

const ESLINT_SEVERITY = { 1: 'warning', 2: 'error' };

function readJson(file) {
  const path = join(dir, file);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

// Map of "rule|severity" -> count.
function tally(entries) {
  const counts = new Map();
  for (const { rule, severity } of entries) {
    const key = `${rule}|${severity}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [rule, severity] = key.split('|');
      return { rule, severity, count };
    })
    .sort((a, b) => b.count - a.count || a.rule.localeCompare(b.rule));
}

const tools = [];
for (const [label, file] of [['ESLint (api)', 'eslint-api.json'], ['ESLint (client)', 'eslint-client.json']]) {
  const report = readJson(file);
  tools.push({
    label,
    missing: report === null,
    rows: report
      ? tally(report.flatMap((f) => f.messages.map((m) => ({ rule: m.ruleId || '(parse error)', severity: ESLINT_SEVERITY[m.severity] || String(m.severity) }))))
      : [],
  });
}
const semgrep = readJson('semgrep.json');
tools.push({
  label: 'Semgrep',
  missing: semgrep === null,
  errors: semgrep ? semgrep.errors.length : 0,
  rows: semgrep ? tally(semgrep.results.map((r) => ({ rule: r.check_id, severity: r.extra.severity }))) : [],
});

const out = [];
const total = (t) => t.rows.reduce((sum, r) => sum + r.count, 0);
if (markdown) {
  out.push('| Tool | Findings |', '|---|---|');
  for (const t of tools) out.push(`| ${t.label} | ${t.missing ? 'missing' : total(t)} |`);
  out.push('');
  for (const t of tools.filter((x) => x.rows.length > 0)) {
    out.push(`**${t.label}**`, '', '| Rule | Severity | Count |', '|---|---|---|');
    for (const r of t.rows) out.push(`| \`${r.rule}\` | ${r.severity} | ${r.count} |`);
    out.push('');
  }
} else {
  for (const t of tools) {
    out.push(`${t.label}: ${t.missing ? 'MISSING' : `${total(t)} finding(s)`}${t.errors ? `, ${t.errors} scan error(s)` : ''}`);
    for (const r of t.rows) out.push(`  ${String(r.count).padStart(4)}  ${r.severity.padEnd(8)} ${r.rule}`);
  }
}
console.log(out.join('\n'));
