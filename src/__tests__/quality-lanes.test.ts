import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';

const REPO_ROOT = process.cwd();
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const LARGE_FILE_SCRIPT_PATH = path.join(
  REPO_ROOT,
  'tools',
  'quality',
  'large-file-budget.mjs',
);
const SEMGREP_SCRIPT_PATH = path.join(REPO_ROOT, 'tools', 'quality', 'semgrep.ps1');
const SQLFLUFF_SCRIPT_PATH = path.join(
  REPO_ROOT,
  'tools',
  'quality',
  'sqlfluff.ps1',
);

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'momentum-quality-'));
  tempDirs.push(dir);
  return dir;
}

describe('quality lane tooling', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
    vi.restoreAllMocks();
  });

  it('routes the lane entrypoints through node runners', async () => {
    const packageJson = JSON.parse(
      await fs.readFile(PACKAGE_JSON_PATH, 'utf8'),
    ) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['quality:ci:info']).toMatch(
      /^node tools\/quality\/lane-runner\.mjs\s+info$/,
    );
    expect(packageJson.scripts['quality:ci:nightly']).toMatch(
      /^node tools\/quality\/lane-runner\.mjs\s+nightly$/,
    );
    expect(packageJson.scripts['quality:smell-audit']).toMatch(
      /^node tools\/quality\/smell-audit\.mjs$/,
    );
    expect(packageJson.scripts['quality:structural-budget']).toMatch(
      /^node tools\/quality\/lane-runner\.mjs\s+structural-budget$/,
    );
    expect(packageJson.scripts['quality:debt-gate']).toMatch(
      /^npm run quality:structural-budget$/,
    );
    expect(packageJson.scripts['quality:comment-debt']).toMatch(
      /^node tools\/quality\/comment-debt\.mjs$/,
    );
  });

  it('defines the info and nightly lanes in terms of leaf checks instead of nested aggregators', async () => {
    const { getLaneChecks } = await import('../../tools/quality/lanes.config.mjs');

    const infoChecks = getLaneChecks('info');
    const scripts = infoChecks.map((check: { script: string }) => check.script);

    expect(scripts).not.toContain('quality:test:audit');
    expect(scripts).not.toContain('quality:debt-gate');
    expect(scripts).not.toContain('quality:ts-prune:strict');
    expect(scripts).not.toContain('quality:depcheck');
    expect(scripts).toContain('quality:test:lint');
    expect(scripts).toContain('quality:test:lint-budget');
    expect(scripts).toContain('quality:debt-gate:core');
    expect(scripts).toContain('quality:large-files');

    const nightlyChecks = getLaneChecks('nightly');
    const nightlyScripts = nightlyChecks.map(
      (check: { script: string }) => check.script,
    );

    expect(nightlyScripts).not.toContain('quality:debt-gate');
    expect(nightlyScripts).not.toContain('quality:structural-budget');
    expect(nightlyScripts).toContain('test:mutation');
    expect(nightlyScripts).toContain('quality:test:mutation-hotspots');
    expect(nightlyScripts).toContain('quality:jscpd');
    expect(nightlyScripts).toContain('quality:debt-gate:core');
    expect(nightlyScripts).toContain('quality:large-files');
    expect(nightlyScripts).toContain('quality:depcheck');
    expect(nightlyScripts).toContain('security:semgrep');
  });

  it('wires comment debt into the smell-audit lane', async () => {
    const { getLaneChecks } = await import('../../tools/quality/lanes.config.mjs');

    const smellAuditChecks = getLaneChecks('smell-audit');
    const smellAuditScripts = smellAuditChecks.map(
      (check: { script: string }) => check.script,
    );

    expect(smellAuditScripts).toContain('quality:comment-debt');
  });

  it('runs every check and distinguishes pass, fail, stale, and blocked', async () => {
    const tempDir = await makeTempDir();
    const freshReportPath = path.join(tempDir, 'fresh.json');
    const staleReportPath = path.join(tempDir, 'stale.json');

    await fs.writeFile(staleReportPath, JSON.stringify({ ok: true }), 'utf8');

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { runLane } = await import('../../tools/quality/quality-runner.mjs');

    const seen: string[] = [];
    const result = await runLane({
      laneId: 'test',
      repoRoot: tempDir,
      checks: [
        {
          id: 'pass-check',
          label: 'Pass check',
          script: 'quality:pass',
          reports: [freshReportPath],
        },
        {
          id: 'fail-check',
          label: 'Fail check',
          script: 'quality:fail',
          reports: [],
        },
        {
          id: 'stale-check',
          label: 'Stale check',
          script: 'quality:stale',
          reports: [staleReportPath],
        },
        {
          id: 'blocked-check',
          label: 'Blocked check',
          script: 'quality:blocked',
          reports: [path.join(tempDir, 'missing.json')],
        },
      ],
      executeCheck: async (check: { id: string }) => {
        seen.push(check.id);

        if (check.id === 'pass-check') {
          await fs.writeFile(freshReportPath, JSON.stringify({ ok: true }), 'utf8');
          return { exitCode: 0, stdout: 'ok', stderr: '' };
        }

        if (check.id === 'fail-check') {
          return { exitCode: 1, stdout: '', stderr: 'failed' };
        }

        if (check.id === 'stale-check') {
          return { exitCode: 0, stdout: 'stale', stderr: '' };
        }

        return {
          exitCode: null,
          stdout: '',
          stderr: 'spawn error',
          error: new Error('spawn error'),
        };
      },
    });

    expect(seen).toEqual([
      'pass-check',
      'fail-check',
      'stale-check',
      'blocked-check',
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.results.map((entry: { id: string; status: string }) => ({
      id: entry.id,
      status: entry.status,
    }))).toEqual([
      { id: 'pass-check', status: 'pass' },
      { id: 'fail-check', status: 'fail' },
      { id: 'stale-check', status: 'stale' },
      { id: 'blocked-check', status: 'blocked' },
    ]);
  });

  it('allows informational lanes to exit zero even when checks fail', async () => {
    const tempDir = await makeTempDir();

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { runLane } = await import('../../tools/quality/quality-runner.mjs');

    const result = await runLane({
      laneId: 'ad-hoc-info',
      repoRoot: tempDir,
      exitPolicy: 'info',
      checks: [
        {
          id: 'fail-check',
          label: 'Fail check',
          script: 'quality:fail',
          reports: [],
        },
      ],
      executeCheck: async () => ({ exitCode: 1, stdout: '', stderr: 'failed' }),
    });

    expect(result.exitCode).toBe(0);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.status).toBe('fail');
  });

  it('marks semgrep and sqlfluff optional locally but required in CI', async () => {
    const semgrepSource = await fs.readFile(SEMGREP_SCRIPT_PATH, 'utf8');
    const sqlfluffSource = await fs.readFile(SQLFLUFF_SCRIPT_PATH, 'utf8');

    expect(semgrepSource).toMatch(/Test-IsCiEnvironment/);
    expect(semgrepSource).toMatch(/\[semgrep\] SKIPPED:/);
    expect(semgrepSource).toMatch(/required in CI/);

    expect(sqlfluffSource).toMatch(/Test-IsCiEnvironment/);
    expect(sqlfluffSource).toMatch(/\[sqlfluff\] SKIPPED:/);
    expect(sqlfluffSource).toMatch(/required in CI/);
  });

  it('ratchets the large-file budget against the checked-in baseline', async () => {
    const { loadLargeFileBudgetBaseline, evaluateLargeFileBudget } = await import(
      '../../tools/quality/large-file-budget.mjs'
    );

    const baseline = await loadLargeFileBudgetBaseline();
    const report = evaluateLargeFileBudget({
      largeFiles: [
        { file: 'src/components/RSIPView.tsx', lines: 879 },
        { file: 'src/new/LargeFile.ts', lines: 301 },
      ],
      baseline,
      maxLargeFiles: 15,
      lineThreshold: 300,
    });

    expect(report.mode).toBe('ratchet');
    expect(report.passed).toBe(false);
    expect(report.newOffenders).toEqual([
      { file: 'src/new/LargeFile.ts', lines: 301 },
    ]);
    expect(report.grownOffenders).toEqual([]);
  });

  it('passes the large-file budget when the backlog shrinks relative to baseline', async () => {
    const tempDir = await makeTempDir();
    const baselinePath = path.join(tempDir, 'large-file-baseline.json');
    const sourceRoot = path.join(tempDir, 'src');

    await fs.mkdir(path.join(sourceRoot, 'nested'), { recursive: true });
    await fs.writeFile(
      path.join(sourceRoot, 'a.ts'),
      `${'export const a = 1;\n'.repeat(305)}\n`,
      'utf8',
    );
    await fs.writeFile(
      path.join(sourceRoot, 'nested', 'small.ts'),
      'export const small = true;\n',
      'utf8',
    );

    await fs.writeFile(
      baselinePath,
      JSON.stringify(
        {
          lineThreshold: 300,
          maxLargeFiles: 15,
          offenders: [
            { file: 'src/a.ts', lines: 340 },
            { file: 'src/b.ts', lines: 310 },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    const result = spawnSync(process.execPath, [LARGE_FILE_SCRIPT_PATH], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        LARGE_FILE_BASELINE_PATH: baselinePath,
        LARGE_FILE_LINE_THRESHOLD: '300',
        LARGE_FILE_SOURCE_ROOT: sourceRoot,
      },
    });

    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/RATCHET PASSED/i);
  });
});
