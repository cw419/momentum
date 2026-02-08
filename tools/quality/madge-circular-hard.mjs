import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const reportPath = path.join(
  repoRoot,
  'reports',
  'quality',
  'madge-circular.json',
);

const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
const circularCount = report?.circularCount ?? 0;

if (circularCount > 0) {
  console.error(`[hard-gate][madge] circular deps: ${circularCount}`);
  process.exit(1);
}

console.log('[hard-gate][madge] no circular deps');
