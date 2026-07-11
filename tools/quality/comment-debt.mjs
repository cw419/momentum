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
const DEFAULT_REPORT_PATH = join('reports', 'quality', 'comment-debt.json');
const DEFAULT_BASELINE_PATH = join(
  'tools',
  'quality',
  'comment-debt-baseline.json',
);

const INCLUDED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const IGNORED_COMMENT_PATTERNS = [
  /^(eslint|tslint|istanbul)\b/i,
  /^@ts-(expect-error|ignore|nocheck|check)\b/i,
  /^cspell:/i,
  /^(todo|fixme|note|hack)\b/i,
];

const HARD_COMMENT_PATTERNS = [
  /^(if|else if|else|for|while|switch|case|return|throw|try|catch|finally|await|async|const|let|var|function|class|interface|type|enum|import|export|new)\b/,
  /^<\/?[A-Za-z][^>]*>$/,
  /=>/,
  /^\}?[\])};,]+$/,
  /^[A-Za-z_$][\w$.]*\([^)]*\)\s*[;{]?$/,
  /^[A-Za-z_$][\w$.]*\s*(?:\+\+|--|[+\-*/%]?=)\s*.+/,
  /^[A-Za-z_$][\w$]*\s*:\s*(?:['"`[{]|\d|true\b|false\b|null\b).*/,
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
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
    normalized.includes('/__mocks__/') ||
    normalized.includes('/test/') ||
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

function sortFileCounts(entries) {
  return [...entries].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.file.localeCompare(right.file);
  });
}

function normalizeBaselineFiles(files) {
  return sortFileCounts(
    (files ?? []).map((entry) => ({
      file: normalizePath(entry.file),
      count: Number(entry.count),
    })),
  );
}

function stripLineComment(rawLine) {
  return rawLine.replace(/^\s*\/\/\s?/, '').trim();
}

function isIgnoredComment(rawLine, text) {
  return (
    rawLine.startsWith('///') ||
    IGNORED_COMMENT_PATTERNS.some((pattern) => pattern.test(text))
  );
}

function isHardComment(text) {
  return HARD_COMMENT_PATTERNS.some((pattern) => pattern.test(text));
}

function classifyComment(rawLine) {
  const text = stripLineComment(rawLine);
  if (text.length === 0) return 'ignored';
  if (isIgnoredComment(rawLine, text)) return 'ignored';
  return isHardComment(text) ? 'hard' : 'soft';
}

export function collectCommentDebt({
  repoRoot = process.cwd(),
  sourceRoot = DEFAULT_SOURCE_ROOT,
} = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedSourceRoot = path.resolve(resolvedRepoRoot, sourceRoot);

  if (
    !existsSync(resolvedSourceRoot) ||
    !statSync(resolvedSourceRoot).isDirectory()
  ) {
    throw new Error(`Source directory "${resolvedSourceRoot}" not found.`);
  }

  const softCounts = new Map();
  const hardViolations = [];

  for (const absolutePath of walkFiles(resolvedSourceRoot)) {
    const displayPath = toDisplayPath(resolvedRepoRoot, absolutePath);
    if (isTestLike(displayPath)) continue;

    const lines = readFileSync(absolutePath, 'utf8').split(/\r?\n/);

    lines.forEach((line, index) => {
      const trimmed = line.trimStart();
      if (!trimmed.startsWith('//')) return;

      const classification = classifyComment(trimmed);
      if (classification === 'ignored') return;

      if (classification === 'hard') {
        hardViolations.push({
          file: displayPath,
          line: index + 1,
          text: stripLineComment(trimmed),
        });
        return;
      }

      softCounts.set(displayPath, (softCounts.get(displayPath) ?? 0) + 1);
    });
  }

  const files = sortFileCounts(
    Array.from(softCounts.entries()).map(([file, count]) => ({ file, count })),
  );

  return {
    hardViolations,
    hardViolationCount: hardViolations.length,
    softCommentLineCount: files.reduce(
      (total, entry) => total + entry.count,
      0,
    ),
    files,
  };
}

export function loadCommentDebtBaseline({
  repoRoot = process.cwd(),
  baselinePath = process.env.COMMENT_DEBT_BASELINE_PATH ??
    DEFAULT_BASELINE_PATH,
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
    softCommentLineCount: Number(parsed.softCommentLineCount ?? 0),
    files: normalizeBaselineFiles(parsed.files),
  };
}

export function evaluateCommentDebtBudget({
  softCommentLineCount,
  files,
  baseline,
}) {
  if (!baseline) {
    return {
      mode: 'absolute',
      passed: true,
      baselineSoftCommentLineCount: null,
      softCommentLineCount,
      delta: null,
      grownFiles: [],
      newFiles: [],
    };
  }

  const baselineMap = new Map(
    baseline.files.map((entry) => [entry.file, entry.count]),
  );
  const newFiles = files.filter((entry) => !baselineMap.has(entry.file));
  const grownFiles = files
    .filter((entry) => {
      const baselineCount = baselineMap.get(entry.file);
      return baselineCount != null && entry.count > baselineCount;
    })
    .map((entry) => ({
      ...entry,
      baselineCount: baselineMap.get(entry.file),
    }));

  return {
    mode: 'ratchet',
    passed: softCommentLineCount <= baseline.softCommentLineCount,
    baselineSoftCommentLineCount: baseline.softCommentLineCount,
    softCommentLineCount,
    delta: softCommentLineCount - baseline.softCommentLineCount,
    grownFiles,
    newFiles,
  };
}

function writeReport(reportPath, report) {
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function logOutcome(repoRoot, reportPath, report) {
  console.log(
    `[comment-debt] hard violations: ${report.hardViolationCount}; soft comment lines: ${report.softCommentLineCount}.`,
  );
  console.log(`[comment-debt] report: ${toDisplayPath(repoRoot, reportPath)}`);

  if (report.softBudget.mode === 'ratchet') {
    const relation =
      report.softBudget.delta <= 0 ? 'within baseline' : 'above baseline';
    console.log(
      `[comment-debt] soft budget: ${relation} (${report.softBudget.softCommentLineCount} vs ${report.softBudget.baselineSoftCommentLineCount}).`,
    );
  }

  if (report.hardViolationCount === 0) {
    return;
  }

  console.error('[comment-debt] Commented-out code detected:');
  for (const entry of report.hardViolations.slice(0, 10)) {
    console.error(`  - ${entry.file}:${entry.line} ${entry.text}`);
  }
}

export function runCommentDebt({
  repoRoot = process.cwd(),
  sourceRoot = process.env.COMMENT_DEBT_SOURCE_ROOT ?? DEFAULT_SOURCE_ROOT,
  reportPath = DEFAULT_REPORT_PATH,
  baselinePath = process.env.COMMENT_DEBT_BASELINE_PATH ??
    DEFAULT_BASELINE_PATH,
} = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedReportPath = path.resolve(resolvedRepoRoot, reportPath);
  const snapshot = collectCommentDebt({
    repoRoot: resolvedRepoRoot,
    sourceRoot,
  });
  const baseline = loadCommentDebtBaseline({
    repoRoot: resolvedRepoRoot,
    baselinePath,
  });
  const softBudget = evaluateCommentDebtBudget({
    softCommentLineCount: snapshot.softCommentLineCount,
    files: snapshot.files,
    baseline,
  });
  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot: toDisplayPath(
      resolvedRepoRoot,
      path.resolve(resolvedRepoRoot, sourceRoot),
    ),
    ...snapshot,
    softBudget,
  };

  writeReport(resolvedReportPath, report);
  logOutcome(resolvedRepoRoot, resolvedReportPath, report);

  return {
    ...report,
    exitCode: report.hardViolationCount > 0 ? 1 : 0,
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
  const result = runCommentDebt();
  process.exit(result.exitCode);
}
