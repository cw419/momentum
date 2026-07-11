import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'momentum-comment-debt-'),
  );
  tempDirs.push(dir);
  return dir;
}

describe('comment debt tooling', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
    vi.restoreAllMocks();
  });

  it('reports commented-out code as hard violations and ignores directives', async () => {
    const tempDir = await makeTempDir();
    const sourceRoot = path.join(tempDir, 'src');
    const reportPath = path.join(tempDir, 'reports', 'comment-debt.json');

    await fs.mkdir(sourceRoot, { recursive: true });
    await fs.writeFile(
      path.join(sourceRoot, 'sample.ts'),
      [
        '// keeps the UI in sync after storage writes',
        '// TODO: remove once migration is complete',
        '// eslint-disable-next-line no-console',
        'console.log("live code");',
        '// if (enabled) {',
        '//   syncNow();',
        '// }',
        '/// <reference types="vite/client" />',
        'export const active = true;',
        '',
      ].join('\n'),
      'utf8',
    );

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { runCommentDebt } =
      await import('../../tools/quality/comment-debt.mjs');

    const result = runCommentDebt({
      repoRoot: tempDir,
      sourceRoot,
      reportPath,
      baselinePath: path.join(tempDir, 'comment-debt-baseline.json'),
    });

    expect(result.exitCode).toBe(1);
    expect(result.hardViolationCount).toBe(3);
    expect(result.softCommentLineCount).toBe(1);
    expect(result.hardViolations.map((entry) => entry.line)).toEqual([5, 6, 7]);
    expect(
      result.hardViolations.every((entry) => entry.file === 'src/sample.ts'),
    ).toBe(true);
  });

  it('reports soft-budget regressions without failing when hard violations are absent', async () => {
    const tempDir = await makeTempDir();
    const sourceRoot = path.join(tempDir, 'src');
    const reportPath = path.join(tempDir, 'reports', 'comment-debt.json');
    const baselinePath = path.join(tempDir, 'comment-debt-baseline.json');

    await fs.mkdir(sourceRoot, { recursive: true });
    await fs.writeFile(
      path.join(sourceRoot, 'sample.ts'),
      [
        '// sync entrypoint',
        'export const active = true;',
        '// cache boundary explanation',
        '',
      ].join('\n'),
      'utf8',
    );
    await fs.writeFile(
      baselinePath,
      JSON.stringify(
        {
          softCommentLineCount: 1,
          files: [{ file: 'src/sample.ts', count: 1 }],
        },
        null,
        2,
      ),
      'utf8',
    );

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { runCommentDebt } =
      await import('../../tools/quality/comment-debt.mjs');

    const result = runCommentDebt({
      repoRoot: tempDir,
      sourceRoot,
      reportPath,
      baselinePath,
    });

    expect(result.exitCode).toBe(0);
    expect(result.hardViolationCount).toBe(0);
    expect(result.softBudget.mode).toBe('ratchet');
    expect(result.softBudget.passed).toBe(false);
    expect(result.softBudget.delta).toBe(1);
    expect(result.softBudget.grownFiles).toEqual([
      { file: 'src/sample.ts', count: 2, baselineCount: 1 },
    ]);
  });

  it('treats labeled explanation comments as soft debt instead of hard violations', async () => {
    const tempDir = await makeTempDir();
    const sourceRoot = path.join(tempDir, 'src');
    const reportPath = path.join(tempDir, 'reports', 'comment-debt.json');

    await fs.mkdir(sourceRoot, { recursive: true });
    await fs.writeFile(
      path.join(sourceRoot, 'sample.ts'),
      [
        '// Migration: add default values for new fields if they do not exist',
        '// ENHANCED: process each chain individually with better error handling',
        'export const active = true;',
        '',
      ].join('\n'),
      'utf8',
    );

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { runCommentDebt } =
      await import('../../tools/quality/comment-debt.mjs');

    const result = runCommentDebt({
      repoRoot: tempDir,
      sourceRoot,
      reportPath,
      baselinePath: path.join(tempDir, 'comment-debt-baseline.json'),
    });

    expect(result.exitCode).toBe(0);
    expect(result.hardViolationCount).toBe(0);
    expect(result.softCommentLineCount).toBe(2);
  });
});
