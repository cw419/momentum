import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const REPORTS_DIR = 'reports/quality';
const REPORT_PATH = join(REPORTS_DIR, 'test-lint-budget.json');

const MAX_TEST_LINT_WARNINGS = Number(process.env.MAX_TEST_LINT_WARNINGS ?? 20);
const MAX_TEST_LINT_ERRORS = Number(process.env.MAX_TEST_LINT_ERRORS ?? 0);

function resolveEslintCommand() {
  const localScript = resolve(
    process.cwd(),
    'node_modules',
    'eslint',
    'bin',
    'eslint.js',
  );

  if (existsSync(localScript)) {
    return { command: process.execPath, useNpx: false, localScript };
  }

  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    useNpx: true,
    localScript: null,
  };
}

const eslint = resolveEslintCommand();
const eslintArgs = [
  ...(eslint.useNpx ? ['eslint'] : [eslint.localScript]),
  '-c',
  'eslint.tests.config.js',
  'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
  'src/**/__tests__/**/*.{js,ts,jsx,tsx}',
  '--no-error-on-unmatched-pattern',
  '-f',
  'json',
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function dedupeMessages(results) {
  const seen = new Set();
  const deduped = [];

  for (const result of results) {
    const filePath = normalizePath(result.filePath ?? '');
    for (const message of result.messages ?? []) {
      const key = [
        filePath,
        message.line ?? 0,
        message.column ?? 0,
        message.ruleId ?? '(unknown)',
        message.message ?? '',
      ].join(':');
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push({
        filePath,
        line: message.line ?? 0,
        column: message.column ?? 0,
        ruleId: message.ruleId ?? '(unknown)',
        severity: message.severity ?? 0,
        message: message.message ?? '',
      });
    }
  }

  return deduped;
}

function main() {
  const eslintRun = spawnSync(eslint.command, eslintArgs, {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });

  if (eslintRun.error) {
    console.error('[test-lint-budget] Failed to run ESLint.', eslintRun.error);
    process.exit(1);
  }

  let parsed;
  const rawOutput = (eslintRun.stdout ?? '').trim();
  if (!rawOutput) {
    if (eslintRun.status === 0) {
      parsed = [];
    } else {
      console.error('[test-lint-budget] Failed to receive ESLint output.');
      if (eslintRun.stderr) console.error(eslintRun.stderr.trim());
      process.exit(1);
    }
  } else {
    try {
      parsed = JSON.parse(rawOutput);
    } catch (error) {
      console.error('[test-lint-budget] Failed to parse ESLint JSON output.');
      console.error(rawOutput);
      if (eslintRun.stderr) console.error(eslintRun.stderr.trim());
      process.exit(1);
    }
  }

  const dedupedMessages = dedupeMessages(parsed);
  const warningCount = dedupedMessages.filter((m) => m.severity === 1).length;
  const errorCount = dedupedMessages.filter((m) => m.severity === 2).length;

  const warningsByRule = dedupedMessages
    .filter((m) => m.severity === 1)
    .reduce((acc, message) => {
      acc[message.ruleId] = (acc[message.ruleId] ?? 0) + 1;
      return acc;
    }, {});

  const topWarningRules = Object.entries(warningsByRule)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  mkdirSync(REPORTS_DIR, { recursive: true });
  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        maxWarnings: MAX_TEST_LINT_WARNINGS,
        maxErrors: MAX_TEST_LINT_ERRORS,
        warnings: warningCount,
        errors: errorCount,
        filesScanned: parsed.length,
        uniqueMessages: dedupedMessages.length,
        topWarningRules,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  console.log(
    `[test-lint-budget] warnings: ${warningCount} (max ${MAX_TEST_LINT_WARNINGS}), errors: ${errorCount} (max ${MAX_TEST_LINT_ERRORS})`,
  );
  console.log(`[test-lint-budget] report: ${REPORT_PATH}`);

  if (
    warningCount > MAX_TEST_LINT_WARNINGS ||
    errorCount > MAX_TEST_LINT_ERRORS
  ) {
    console.error('[test-lint-budget] FAILED');
    for (const entry of topWarningRules) {
      console.error(`  - ${entry.rule}: ${entry.count}`);
    }
    process.exit(1);
  }

  console.log('[test-lint-budget] PASSED');
}

main();
