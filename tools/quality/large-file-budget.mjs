import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { extname, join } from 'node:path';

const SRC_ROOT = 'src';
const REPORTS_DIR = 'reports/quality';
const REPORT_PATH = join(REPORTS_DIR, 'large-file-budget.json');

const LINE_THRESHOLD = Number(process.env.LARGE_FILE_LINE_THRESHOLD ?? 300);
const MAX_LARGE_FILES = Number(process.env.MAX_LARGE_FILES ?? 15);

const INCLUDED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const EXCLUDED_FILES = new Set(['src/lib/database.types.ts']);

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function isTestLike(filePath) {
  const normalized = normalizePath(filePath);
  return (
    normalized.includes('/__tests__/') ||
    /\.(test|spec)\.[jt]sx?$/.test(normalized) ||
    /\.(integration|db|performance)\.test\.[jt]sx?$/.test(normalized)
  );
}

function walkFiles(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!INCLUDED_EXTENSIONS.has(extname(entry.name))) continue;
    files.push(absolutePath);
  }

  return files;
}

function countLines(filePath) {
  const content = readFileSync(filePath, 'utf8');
  if (content.length === 0) return 0;
  return content.split(/\r?\n/).length;
}

function main() {
  if (!statSync(SRC_ROOT).isDirectory()) {
    throw new Error(`Source directory "${SRC_ROOT}" not found.`);
  }

  const sourceFiles = walkFiles(SRC_ROOT)
    .map((filePath) => normalizePath(filePath))
    .filter((filePath) => !isTestLike(filePath))
    .filter((filePath) => !EXCLUDED_FILES.has(filePath));

  const largeFiles = sourceFiles
    .map((filePath) => ({ file: filePath, lines: countLines(filePath) }))
    .filter(({ lines }) => lines > LINE_THRESHOLD)
    .sort((a, b) => b.lines - a.lines);

  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        lineThreshold: LINE_THRESHOLD,
        maxLargeFiles: MAX_LARGE_FILES,
        largeFileCount: largeFiles.length,
        offenders: largeFiles,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  console.log(
    `[large-file-budget] ${largeFiles.length} file(s) exceed ${LINE_THRESHOLD} lines (max allowed: ${MAX_LARGE_FILES}).`,
  );
  console.log(`[large-file-budget] report: ${REPORT_PATH}`);

  if (largeFiles.length > MAX_LARGE_FILES) {
    console.error('[large-file-budget] FAILED');
    for (const offender of largeFiles.slice(0, 10)) {
      console.error(`  - ${offender.file} (${offender.lines})`);
    }
    process.exit(1);
  }

  console.log('[large-file-budget] PASSED');
}

main();
