import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

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

const tsPruneBin = resolvePackageBin('ts-prune', 'ts-prune');

const result = spawnSync(
  process.execPath,
  [tsPruneBin, '-p', 'tsconfig.ts-prune.json', '-i', 'index\\.tsx?:'],
  {
    encoding: 'utf8',
  },
);

if (result.error) {
  console.error(
    '[ts-prune-hard] Failed to execute ts-prune:',
    result.error.message,
  );
  process.exit(1);
}

if ((result.status ?? 1) !== 0) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const findings = (result.stdout ?? '')
  .split(/\r?\n/u)
  .filter((line) => line.trim().length > 0)
  .filter((line) => !line.endsWith('(used in module)'))
  .join('\n');
if (findings.length > 0) {
  console.error('[ts-prune-hard] Unused exports found:');
  console.error(findings);
  process.exit(1);
}

console.log('[ts-prune-hard] No unused exports found.');
