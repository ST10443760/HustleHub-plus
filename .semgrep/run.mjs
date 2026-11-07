#!/usr/bin/env node
/**
 * Runs Semgrep Community Edition from a pinned container image, so it works
 * the same on Windows, macOS and Linux with only Docker and Node installed
 * (no Python). Used locally and by the pipeline.
 *
 *   node .semgrep/run.mjs                  # results in semgrep-results/
 *   node .semgrep/run.mjs --out some/dir   # results somewhere else
 *
 * Writes semgrep.json and semgrep.sarif, prints the findings as text, and
 * exits non-zero when there is ANY finding (--error) or Semgrep fails.
 * Metrics are off and only the open-source engine and rules are used.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const IMAGE = 'semgrep/semgrep:1.184.0@sha256:cc1b68266f267878b39739373ea9985b9a78e5d64497dd875c8de100b22695ed';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const outDir = resolve(outArg > -1 ? process.argv[outArg + 1] : join(repoRoot, 'semgrep-results'));
const outInRepo = relative(repoRoot, outDir).split('\\').join('/');
if (outInRepo.startsWith('..')) {
  console.error('--out must be inside the repository');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const packs = readFileSync(join(repoRoot, '.semgrep', 'rulesets.txt'), 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

// On Linux, run as the current user so the result files aren't owned by root.
const user = typeof process.getuid === 'function' ? ['--user', `${process.getuid()}:${process.getgid()}`] : [];

const args = [
  'run', '--rm', ...user,
  '-e', 'HOME=/tmp',
  '-v', `${repoRoot}:/src`,
  '--workdir', '/src',
  IMAGE,
  'semgrep', 'scan',
  '--metrics=off',
  '--disable-version-check',
  '--oss-only',
  ...packs.flatMap((pack) => ['--config', pack]),
  '--error',
  '--text',
  `--json-output=/src/${outInRepo}/semgrep.json`,
  `--sarif-output=/src/${outInRepo}/semgrep.sarif`,
  '.',
];

console.log(`Semgrep ${IMAGE.split('@')[0]} with ${packs.join(', ')}`);
// MSYS_NO_PATHCONV stops Git Bash on Windows rewriting /src into a Windows path.
const result = spawnSync('docker', args, { stdio: 'inherit', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
if (result.error) {
  console.error(`Could not start docker: ${result.error.message}`);
  process.exit(2);
}
console.log(`\nResults: ${outInRepo}/semgrep.json and semgrep.sarif`);
process.exit(result.status ?? 1);
