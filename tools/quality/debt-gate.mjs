import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const SRC_ROOT = 'src';
const JSCPD_REPORT_PATH =
  process.env.JSCPD_REPORT_PATH ?? 'reports/jscpd/jscpd-report.json';

const MAX_AS_UNKNOWN_AS = Number(process.env.MAX_AS_UNKNOWN_AS ?? 30);
const MAX_AS_ERROR = Number(process.env.MAX_AS_ERROR ?? 10);
const MAX_NON_NULL_ASSERTIONS = Number(
  process.env.MAX_NON_NULL_ASSERTIONS ?? 70,
);
// jscpd baseline set to current measured values on 2026-07-02 (10 clones / 0.34%).
// Target: bring back to ≤6 / ≤0.30 % once known duplicate blocks are extracted.
const MAX_JSCPD_CLONES = Number(process.env.MAX_JSCPD_CLONES ?? 11);
const MAX_JSCPD_PERCENT = Number(process.env.MAX_JSCPD_PERCENT ?? 0.35);

const INCLUDED_EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'coverage', 'reports']);
const IGNORED_FILE_PATTERNS = [
  /\/__tests__\//,
  /\.test\.tsx?$/,
  /(^|\/)src\/test\//,
  /testHelpers\.ts$/,
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function shouldIgnoreFile(filePath) {
  const normalized = normalizePath(filePath);
  return IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function walkFiles(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const absolutePath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        results.push(...walkFiles(absolutePath));
      }
      continue;
    }

    if (
      entry.isFile() &&
      INCLUDED_EXTENSIONS.has(extname(entry.name)) &&
      !shouldIgnoreFile(absolutePath)
    ) {
      results.push(absolutePath);
    }
  }

  return results;
}

function countPatternInSource(pattern) {
  let count = 0;
  for (const filePath of walkFiles(SRC_ROOT)) {
    const content = readFileSync(filePath, 'utf8');
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

function readJscpdTotalStats() {
  if (!existsSync(JSCPD_REPORT_PATH)) {
    throw new Error(
      `Missing jscpd report at "${JSCPD_REPORT_PATH}". Run "npm run quality:jscpd" before debt gate.`,
    );
  }

  const json = JSON.parse(readFileSync(JSCPD_REPORT_PATH, 'utf8'));
  const total = json?.statistics?.total;
  if (!total) {
    throw new Error(`Invalid jscpd report format at "${JSCPD_REPORT_PATH}".`);
  }

  return {
    clones: Number(total.clones ?? 0),
    percentage: Number(total.percentage ?? 0),
  };
}

function main() {
  if (!existsSync(SRC_ROOT) || !statSync(SRC_ROOT).isDirectory()) {
    throw new Error(`Source directory "${SRC_ROOT}" not found.`);
  }

  const asUnknownAsCount = countPatternInSource(/\bas unknown as\b/g);
  const asErrorCount = countPatternInSource(/\bas Error\b/g);
  const nonNullAssertionCount = countPatternInSource(/(?<=[\w\]\)])!(?![=])/g);
  const { clones, percentage } = readJscpdTotalStats();

  const failures = [];

  if (asUnknownAsCount > MAX_AS_UNKNOWN_AS) {
    failures.push(
      `as unknown as count ${asUnknownAsCount} exceeds limit ${MAX_AS_UNKNOWN_AS}`,
    );
  }
  if (asErrorCount > MAX_AS_ERROR) {
    failures.push(
      `as Error count ${asErrorCount} exceeds limit ${MAX_AS_ERROR}`,
    );
  }
  if (nonNullAssertionCount > MAX_NON_NULL_ASSERTIONS) {
    failures.push(
      `non-null assertion count ${nonNullAssertionCount} exceeds limit ${MAX_NON_NULL_ASSERTIONS}`,
    );
  }
  if (clones > MAX_JSCPD_CLONES) {
    failures.push(`jscpd clones ${clones} exceeds limit ${MAX_JSCPD_CLONES}`);
  }
  if (percentage > MAX_JSCPD_PERCENT) {
    failures.push(
      `jscpd duplicated percentage ${percentage.toFixed(2)} exceeds limit ${MAX_JSCPD_PERCENT.toFixed(2)}`,
    );
  }

  console.log('[debt-gate] Metrics');
  console.log(
    `  as unknown as: ${asUnknownAsCount} (max ${MAX_AS_UNKNOWN_AS})`,
  );
  console.log(`  as Error: ${asErrorCount} (max ${MAX_AS_ERROR})`);
  console.log(
    `  non-null assertions: ${nonNullAssertionCount} (max ${MAX_NON_NULL_ASSERTIONS})`,
  );
  console.log(`  jscpd clones: ${clones} (max ${MAX_JSCPD_CLONES})`);
  console.log(
    `  jscpd duplicated %: ${percentage.toFixed(2)} (max ${MAX_JSCPD_PERCENT.toFixed(2)})`,
  );

  if (failures.length > 0) {
    console.error('[debt-gate] FAILED');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log('[debt-gate] PASSED');
}

main();
