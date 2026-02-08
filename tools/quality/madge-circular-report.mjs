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

const REGEX_PRESETS = Object.freeze({
  '.*\\.test\\..*': /.*\.test\..*/,
  '.*\\.spec\\..*': /.*\.spec\..*/,
  __tests__: /__tests__/,
  __mocks__: /__mocks__/,
  node_modules: /node_modules/,
});

const configuredExcludePatterns = Array.isArray(madgeConfig.excludeRegExp)
  ? madgeConfig.excludeRegExp
  : [];
const unknownExcludePatterns = configuredExcludePatterns.filter(
  (pattern) => !REGEX_PRESETS[pattern],
);
if (unknownExcludePatterns.length > 0) {
  throw new Error(
    `[madge-circular-report] Unknown excludeRegExp pattern(s): ${unknownExcludePatterns.join(', ')}`,
  );
}

const excludeRegExp =
  configuredExcludePatterns.length > 0
    ? configuredExcludePatterns.map((pattern) => REGEX_PRESETS[pattern])
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
await fs.writeFile(
  outJsonPath,
  JSON.stringify(payload, null, 2) + '\n',
  'utf8',
);

console.log(`[soft-gate][madge] circular deps: ${payload.circularCount}`);
console.log(
  `[soft-gate][madge] report: ${path.relative(repoRoot, outJsonPath)}`,
);

process.exitCode = 0;
