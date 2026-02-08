import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, 'reports', 'quality');

await fs.mkdir(reportsDir, { recursive: true });

const outJsonPath = path.join(reportsDir, 'eslint-sonarjs.json');
const eslintArgs = [
  '-c',
  'eslint.sonar.config.js',
  'src',
  '--format',
  'json',
  '--output-file',
  outJsonPath,
];

function resolvePackageBin(packageName, binName) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  const packageJson = require(packageJsonPath);
  const binField = packageJson.bin;
  const relativeBin =
    typeof binField === 'string' ? binField : binField?.[binName];
  if (!relativeBin) {
    throw new Error(
      `Unable to resolve bin "${binName}" from package "${packageName}"`,
    );
  }
  return path.resolve(path.dirname(packageJsonPath), relativeBin);
}

const eslintBin = resolvePackageBin('eslint', 'eslint');
const run = spawnSync(process.execPath, [eslintBin, ...eslintArgs], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);

let reportJson = [];
try {
  reportJson = JSON.parse(await fs.readFile(outJsonPath, 'utf8'));
} catch {
  // ignore: eslint might fail before writing output; still treat as soft gate
}

let fileCount = 0;
let messageCount = 0;
const ruleCounts = new Map();

for (const file of reportJson) {
  fileCount += 1;
  for (const message of file.messages ?? []) {
    messageCount += 1;
    const ruleId = message.ruleId ?? '(no-rule)';
    ruleCounts.set(ruleId, (ruleCounts.get(ruleId) ?? 0) + 1);
  }
}

const topRules = Array.from(ruleCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log(
  `[soft-gate][sonarjs] eslint exit code: ${run.status ?? 'unknown'}`,
);
console.log(
  `[soft-gate][sonarjs] files: ${fileCount}, messages: ${messageCount}`,
);
if (topRules.length) {
  console.log('[soft-gate][sonarjs] top rules:');
  for (const [ruleId, count] of topRules) {
    console.log(`- ${ruleId}: ${count}`);
  }
}
console.log(
  `[soft-gate][sonarjs] report: ${path.relative(repoRoot, outJsonPath)}`,
);

process.exitCode = 0;
