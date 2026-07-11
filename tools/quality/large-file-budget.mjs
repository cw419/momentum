import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path, { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SOURCE_ROOT = 'src';
const DEFAULT_REPORT_PATH = join(
  'reports',
  'quality',
  'large-file-budget.json',
);
const DEFAULT_BASELINE_PATH = join(
  'tools',
  'quality',
  'large-file-budget-baseline.json',
);
const DEFAULT_LINE_THRESHOLD = 300;
const DEFAULT_MAX_LARGE_FILES = 15;

const INCLUDED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const EXCLUDED_FILES = new Set(['src/lib/database.types.ts']);

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function getRelativeBase(repoRoot, resolvedSourceRoot) {
  const relativeToRepo = path.relative(repoRoot, resolvedSourceRoot);
  if (
    relativeToRepo !== '' &&
    !relativeToRepo.startsWith('..') &&
    !path.isAbsolute(relativeToRepo)
  ) {
    return repoRoot;
  }

  return path.dirname(resolvedSourceRoot);
}

function toDisplayPath(repoRoot, filePath) {
  const resolvedPath = path.resolve(filePath);
  const relativeToRepo = path.relative(repoRoot, resolvedPath);
  if (
    relativeToRepo !== '' &&
    !relativeToRepo.startsWith('..') &&
    !path.isAbsolute(relativeToRepo)
  ) {
    return normalizePath(relativeToRepo);
  }

  return normalizePath(resolvedPath);
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

function sortLargeFiles(entries) {
  return [...entries].sort((left, right) => {
    if (right.lines !== left.lines) {
      return right.lines - left.lines;
    }

    return left.file.localeCompare(right.file);
  });
}

function normalizeBaselineOffenders(offenders) {
  return sortLargeFiles(
    (offenders ?? []).map((entry) => ({
      file: normalizePath(entry.file),
      lines: Number(entry.lines),
    })),
  );
}

export function collectLargeFiles({
  repoRoot = process.cwd(),
  sourceRoot = DEFAULT_SOURCE_ROOT,
  lineThreshold = DEFAULT_LINE_THRESHOLD,
} = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedSourceRoot = path.resolve(resolvedRepoRoot, sourceRoot);

  if (
    !existsSync(resolvedSourceRoot) ||
    !statSync(resolvedSourceRoot).isDirectory()
  ) {
    throw new Error(`Source directory "${resolvedSourceRoot}" not found.`);
  }

  const relativeBase = getRelativeBase(resolvedRepoRoot, resolvedSourceRoot);
  const sourceFiles = walkFiles(resolvedSourceRoot)
    .map((absolutePath) =>
      normalizePath(path.relative(relativeBase, absolutePath)),
    )
    .filter((filePath) => !isTestLike(filePath))
    .filter((filePath) => !EXCLUDED_FILES.has(filePath));

  return sortLargeFiles(
    sourceFiles
      .map((filePath) => ({
        file: filePath,
        lines: countLines(path.resolve(relativeBase, filePath)),
      }))
      .filter(({ lines }) => lines > lineThreshold),
  );
}

export function loadLargeFileBudgetBaseline({
  repoRoot = process.cwd(),
  baselinePath = process.env.LARGE_FILE_BASELINE_PATH ?? DEFAULT_BASELINE_PATH,
} = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedBaselinePath = path.resolve(resolvedRepoRoot, baselinePath);

  if (!existsSync(resolvedBaselinePath)) {
    return null;
  }

  const parsed = JSON.parse(readFileSync(resolvedBaselinePath, 'utf8'));
  return {
    ...parsed,
    path: toDisplayPath(resolvedRepoRoot, resolvedBaselinePath),
    offenders: normalizeBaselineOffenders(parsed.offenders),
  };
}

export function evaluateLargeFileBudget({
  largeFiles,
  baseline,
  maxLargeFiles,
  lineThreshold,
}) {
  const offenders = sortLargeFiles(largeFiles);

  if (!baseline) {
    return {
      mode: 'absolute',
      passed: offenders.length <= maxLargeFiles,
      lineThreshold,
      maxLargeFiles,
      largeFileCount: offenders.length,
      offenders,
      newOffenders: [],
      grownOffenders: [],
      removedOffenders: [],
      shrunkOffenders: [],
      baselineOffenderCount: null,
      baselinePath: null,
    };
  }

  const baselineMap = new Map(
    baseline.offenders.map((entry) => [entry.file, entry.lines]),
  );
  const currentMap = new Map(
    offenders.map((entry) => [entry.file, entry.lines]),
  );
  const newOffenders = offenders.filter(
    (entry) => !baselineMap.has(entry.file),
  );
  const grownOffenders = offenders
    .filter((entry) => {
      const baselineLines = baselineMap.get(entry.file);
      return baselineLines != null && entry.lines > baselineLines;
    })
    .map((entry) => ({
      ...entry,
      baselineLines: baselineMap.get(entry.file),
    }));
  const removedOffenders = baseline.offenders.filter(
    (entry) => !currentMap.has(entry.file),
  );
  const shrunkOffenders = offenders
    .filter((entry) => {
      const baselineLines = baselineMap.get(entry.file);
      return baselineLines != null && entry.lines < baselineLines;
    })
    .map((entry) => ({
      ...entry,
      baselineLines: baselineMap.get(entry.file),
    }));

  return {
    mode: 'ratchet',
    passed: newOffenders.length === 0 && grownOffenders.length === 0,
    lineThreshold,
    maxLargeFiles,
    largeFileCount: offenders.length,
    offenders,
    newOffenders,
    grownOffenders,
    removedOffenders,
    shrunkOffenders,
    baselineOffenderCount: baseline.offenders.length,
    baselinePath: baseline.path,
  };
}

function writeBudgetReport(reportPath, report) {
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(
    `${reportPath}`,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
}

function logRatchetFailure(report) {
  if (report.newOffenders.length > 0) {
    console.error('[large-file-budget] New offenders:');
    for (const offender of report.newOffenders.slice(0, 10)) {
      console.error(`  - ${offender.file} (${offender.lines})`);
    }
  }

  if (report.grownOffenders.length > 0) {
    console.error('[large-file-budget] Grown offenders:');
    for (const offender of report.grownOffenders.slice(0, 10)) {
      console.error(
        `  - ${offender.file} (${offender.lines}, baseline ${offender.baselineLines})`,
      );
    }
  }
}

function logBudgetOutcome(repoRoot, reportPath, report) {
  const reportLabel = toDisplayPath(repoRoot, reportPath);

  if (report.mode === 'ratchet') {
    console.log(
      `[large-file-budget] ${report.largeFileCount} file(s) exceed ${report.lineThreshold} lines. Ratchet baseline: ${report.baselineOffenderCount}.`,
    );
    console.log(`[large-file-budget] baseline: ${report.baselinePath}`);
  } else {
    console.log(
      `[large-file-budget] ${report.largeFileCount} file(s) exceed ${report.lineThreshold} lines (max allowed: ${report.maxLargeFiles}).`,
    );
  }

  console.log(`[large-file-budget] report: ${reportLabel}`);

  if (!report.passed) {
    console.error(`[large-file-budget] ${report.mode.toUpperCase()} FAILED`);
    if (report.mode === 'ratchet') {
      logRatchetFailure(report);
      return;
    }

    for (const offender of report.offenders.slice(0, 10)) {
      console.error(`  - ${offender.file} (${offender.lines})`);
    }
    return;
  }

  console.log(`[large-file-budget] ${report.mode.toUpperCase()} PASSED`);
  if (report.mode === 'ratchet') {
    console.log(
      `[large-file-budget] backlog: ${report.baselineOffenderCount} -> ${report.largeFileCount}`,
    );
  }
}

export function runLargeFileBudget({
  repoRoot = process.cwd(),
  sourceRoot = process.env.LARGE_FILE_SOURCE_ROOT ?? DEFAULT_SOURCE_ROOT,
  reportPath = DEFAULT_REPORT_PATH,
  baselinePath = process.env.LARGE_FILE_BASELINE_PATH ?? DEFAULT_BASELINE_PATH,
  lineThreshold = Number(
    process.env.LARGE_FILE_LINE_THRESHOLD ?? DEFAULT_LINE_THRESHOLD,
  ),
  maxLargeFiles = Number(
    process.env.MAX_LARGE_FILES ?? DEFAULT_MAX_LARGE_FILES,
  ),
} = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedReportPath = path.resolve(resolvedRepoRoot, reportPath);
  const largeFiles = collectLargeFiles({
    repoRoot: resolvedRepoRoot,
    sourceRoot,
    lineThreshold,
  });
  const baseline = loadLargeFileBudgetBaseline({
    repoRoot: resolvedRepoRoot,
    baselinePath,
  });
  const evaluation = evaluateLargeFileBudget({
    largeFiles,
    baseline,
    maxLargeFiles,
    lineThreshold,
  });
  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot:
      normalizePath(
        path.basename(path.resolve(resolvedRepoRoot, sourceRoot)),
      ) || 'src',
    ...evaluation,
  };

  writeBudgetReport(resolvedReportPath, report);
  logBudgetOutcome(resolvedRepoRoot, resolvedReportPath, report);

  return {
    ...report,
    exitCode: report.passed ? 0 : 1,
  };
}

function isDirectExecution() {
  const entryPoint = process.argv[1];
  if (!entryPoint) {
    return false;
  }

  return import.meta.url === pathToFileURL(path.resolve(entryPoint)).href;
}

if (isDirectExecution()) {
  const result = runLargeFileBudget();
  process.exit(result.exitCode);
}
