export const QUALITY_CHECKS = Object.freeze([
  {
    id: 'mutation',
    label: 'Mutation tests',
    script: 'test:mutation',
    lanes: ['nightly'],
    reports: [],
  },
  {
    id: 'knip',
    label: 'Knip',
    script: 'quality:knip',
    lanes: ['info', 'smell-audit'],
    reports: [],
    textReportPath: 'reports/quality/knip.txt',
  },
  {
    id: 'ts-prune',
    label: 'ts-prune',
    script: 'quality:ts-prune:strict',
    lanes: ['smell-audit'],
    reports: [],
    textReportPath: 'reports/quality/ts-prune.txt',
  },
  {
    id: 'comment-debt',
    label: 'Comment debt',
    script: 'quality:comment-debt',
    lanes: ['smell-audit'],
    reports: ['reports/quality/comment-debt.json'],
    textReportPath: 'reports/quality/comment-debt.txt',
  },
  {
    id: 'depcheck',
    label: 'depcheck',
    script: 'quality:depcheck',
    lanes: ['smell-audit', 'nightly'],
    reports: [],
    textReportPath: 'reports/quality/depcheck.txt',
  },
  {
    id: 'madge-circular',
    label: 'Madge circular',
    script: 'quality:circular',
    lanes: ['info', 'smell-audit'],
    reports: ['reports/quality/madge-circular.json'],
    textReportPath: 'reports/quality/madge-circular.txt',
  },
  {
    id: 'jscpd',
    label: 'JSCPD',
    script: 'quality:jscpd',
    lanes: ['info', 'structural-budget', 'nightly'],
    reports: ['reports/jscpd/jscpd-report.json'],
  },
  {
    id: 'debt-gate-core',
    label: 'Debt gate core',
    script: 'quality:debt-gate:core',
    lanes: ['info', 'structural-budget', 'nightly'],
    reports: [],
  },
  {
    id: 'large-files',
    label: 'Large file budget',
    script: 'quality:large-files',
    lanes: ['info', 'structural-budget', 'nightly'],
    reports: ['reports/quality/large-file-budget.json'],
  },
  {
    id: 'sonarjs',
    label: 'ESLint SonarJS',
    script: 'quality:sonar:report',
    lanes: ['info', 'smell-audit'],
    reports: ['reports/quality/eslint-sonarjs.json'],
    textReportPath: 'reports/quality/eslint-sonarjs.txt',
  },
  {
    id: 'semgrep',
    label: 'Semgrep',
    script: 'security:semgrep',
    lanes: ['info', 'nightly'],
    reports: [],
  },
  {
    id: 'npm-audit',
    label: 'npm audit',
    script: 'security:npm-audit',
    lanes: ['info'],
    reports: [],
  },
  {
    id: 'sqlfluff',
    label: 'SQL lint',
    script: 'lint:sql',
    lanes: ['info'],
    reports: [],
  },
  {
    id: 'test-lint',
    label: 'Test lint',
    script: 'quality:test:lint',
    lanes: ['info'],
    reports: [],
  },
  {
    id: 'test-lint-budget',
    label: 'Test lint budget',
    script: 'quality:test:lint-budget',
    lanes: ['info'],
    reports: ['reports/quality/test-lint-budget.json'],
  },
  {
    id: 'test-assertions',
    label: 'Test assertion lint',
    script: 'quality:test:assertions',
    lanes: ['info'],
    reports: ['reports/quality/test-assertion-lint.json'],
  },
  {
    id: 'test-runtime-budget',
    label: 'Test runtime budget',
    script: 'quality:test:runtime',
    lanes: ['info'],
    reports: ['reports/quality/test-runtime-budget.json'],
  },
  {
    id: 'coverage-hotspots',
    label: 'Coverage hotspots',
    script: 'quality:test:coverage-hotspots',
    lanes: ['info'],
    reports: ['reports/quality/test-coverage-hotspots.json'],
  },
  {
    id: 'mutation-hotspots',
    label: 'Mutation hotspots',
    script: 'quality:test:mutation-hotspots',
    lanes: ['info'],
    reports: ['reports/quality/test-mutation-hotspots.json'],
  },
  {
    id: 'mutation-hotspots-required',
    label: 'Mutation hotspots freshness gate',
    script: 'quality:test:mutation-hotspots:required',
    lanes: ['nightly'],
    reports: ['reports/quality/test-mutation-hotspots.json'],
  },
]);

export const QUALITY_LANES = Object.freeze({
  info: {
    id: 'info',
    label: 'Informational quality lane',
    exitPolicy: 'info',
    summaryJsonPath: 'reports/quality/info-summary.json',
    summaryMarkdownPath: 'reports/quality/info-summary.md',
    logsDir: 'reports/quality/info-logs',
    checks: QUALITY_CHECKS.filter((check) => check.lanes.includes('info')).map(
      (check) => check.id,
    ),
  },
  'smell-audit': {
    id: 'smell-audit',
    label: 'Smell audit',
    exitPolicy: 'required',
    summaryJsonPath: 'reports/quality/smell-audit-summary.json',
    summaryMarkdownPath: 'reports/quality/smell-audit-summary.md',
    logsDir: 'reports/quality/smell-audit-logs',
    checks: QUALITY_CHECKS.filter((check) =>
      check.lanes.includes('smell-audit'),
    ).map((check) => check.id),
  },
  'structural-budget': {
    id: 'structural-budget',
    label: 'Structural budget',
    exitPolicy: 'required',
    summaryJsonPath: 'reports/quality/structural-budget-summary.json',
    summaryMarkdownPath: 'reports/quality/structural-budget-summary.md',
    logsDir: 'reports/quality/structural-budget-logs',
    checks: QUALITY_CHECKS.filter((check) =>
      check.lanes.includes('structural-budget'),
    ).map((check) => check.id),
  },
  nightly: {
    id: 'nightly',
    label: 'Nightly quality lane',
    exitPolicy: 'required',
    summaryJsonPath: 'reports/quality/nightly-summary.json',
    summaryMarkdownPath: 'reports/quality/nightly-summary.md',
    logsDir: 'reports/quality/nightly-logs',
    checks: QUALITY_CHECKS.filter((check) =>
      check.lanes.includes('nightly'),
    ).map((check) => check.id),
  },
});

export function getLaneChecks(laneId) {
  const lane = QUALITY_LANES[laneId];
  if (!lane) {
    throw new Error(`Unknown quality lane "${laneId}".`);
  }

  return lane.checks.map((checkId) => {
    const check = QUALITY_CHECKS.find((entry) => entry.id === checkId);
    if (!check) {
      throw new Error(
        `Unknown quality check "${checkId}" in lane "${laneId}".`,
      );
    }
    return check;
  });
}

export function getLaneConfig(laneId) {
  const lane = QUALITY_LANES[laneId];
  if (!lane) {
    throw new Error(`Unknown quality lane "${laneId}".`);
  }

  return lane;
}
