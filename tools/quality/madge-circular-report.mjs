import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const madge = require('madge');

const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, 'reports', 'quality');

const madgeConfigPath = path.join(repoRoot, '.madgerc');
const madgeConfigRaw = await fs.readFile(madgeConfigPath, 'utf8');
const madgeConfig = JSON.parse(madgeConfigRaw);

const excludeRegExp = Array.isArray(madgeConfig.excludeRegExp)
  ? madgeConfig.excludeRegExp.map((pattern) => new RegExp(pattern))
  : undefined;

const entry = 'src/main.tsx';

await fs.mkdir(reportsDir, { recursive: true });

const result = await madge(entry, {
  fileExtensions: madgeConfig.fileExtensions ?? ['ts', 'tsx'],
  excludeRegExp,
  tsConfig: madgeConfig.tsConfig ?? './tsconfig.app.json',
});

const cycles = result.circular();
const payload = {
  entry,
  circularCount: cycles.length,
  circular: cycles,
};

const outJsonPath = path.join(reportsDir, 'madge-circular.json');
await fs.writeFile(outJsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log(`[soft-gate][madge] circular deps: ${payload.circularCount}`);
console.log(`[soft-gate][madge] report: ${path.relative(repoRoot, outJsonPath)}`);

process.exitCode = 0;
