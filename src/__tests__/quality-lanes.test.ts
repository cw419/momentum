import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const REPO_ROOT = process.cwd();
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');

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

  it('routes the info and smell audit entrypoints through node runners', async () => {
    const packageJson = JSON.parse(
      await fs.readFile(PACKAGE_JSON_PATH, 'utf8'),
    ) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['quality:ci:info']).toMatch(
      /^node tools\/quality\/soft-lane-runner\.mjs(?:\s+info)?$/,
    );
    expect(packageJson.scripts['quality:smell-audit']).toMatch(
      /^node tools\/quality\/smell-audit\.mjs$/,
    );
    expect(packageJson.scripts['quality:debt-gate']).toMatch(
      /^npm run quality:jscpd && npm run quality:debt-gate:core && npm run quality:large-files$/,
    );
    expect(packageJson.scripts['quality:ci:nightly']).toContain(
      'npm run quality:depcheck',
    );
  });

  it('defines the info lane in terms of leaf checks instead of nested aggregators', async () => {
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
});
